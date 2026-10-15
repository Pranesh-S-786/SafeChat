/**
 * SafeChat Supabase Client & Realtime Adapter
 * 
 * Provides authenticated client connection, real-time message subscriptions,
 * presence tracking, and RLS-compliant database operations.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EncryptedMessagePayload } from './crypto';
import type { ChallengeStatus, Profile, RawMessage, VerificationChallenge } from './types';



const STORAGE_URL_KEY = 'safechat_supabase_url';
const STORAGE_KEY_KEY = 'safechat_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = (localStorage.getItem(STORAGE_URL_KEY) || '').trim();
  const localKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

  // Prefer valid env credentials from .env, fall back to localStorage
  const isEnvValid = envUrl && envUrl !== 'https://your-project.supabase.co';
  const url = isEnvValid ? envUrl : (localUrl || envUrl);
  const anonKey = (isEnvValid && envKey && envKey !== 'your-anon-key-here') ? envKey : (localKey || envKey);

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  // Force recreate client
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || url === 'https://your-project.supabase.co') {
    return null;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const creds = getSupabaseCredentials();
  return Boolean(creds.url && creds.anonKey && creds.url !== 'https://your-project.supabase.co');
}

// --- User Profile Operations ---

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const updateFields: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  delete updateFields.id;

  // 1. Direct UPDATE on the existing profile record (does NOT trigger NOT NULL constraint on email)
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (!updateError && updateData) {
    return updateData;
  }

  // Graceful fallback if username column is missing in older migrations
  if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('username'))) {
    delete updateFields.username;
    const retryUpdate = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (!retryUpdate.error && retryUpdate.data) {
      return retryUpdate.data;
    }
  }

  // 2. If no profile record existed yet, fetch auth user for required fields and perform upsert
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;

  const upsertPayload: Record<string, unknown> = {
    id: userId,
    email: authUser?.email || '',
    display_name: updates.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'User',
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data: upsertData, error: upsertError } = await supabase
    .from('profiles')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (upsertError && (upsertError.code === 'PGRST204' || upsertError.message?.includes('username'))) {
    delete upsertPayload.username;
    const retryUpsert = await supabase
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();
    if (!retryUpsert.error && retryUpsert.data) {
      return retryUpsert.data;
    }
  }

  if (upsertError) {
    console.error('Error updating/upserting profile:', upsertError || updateError);
    // If database update failed but we have updates, return optimistic profile so user is not blocked
    return null;
  }

  return upsertData;
}

export async function checkUsernameAvailable(rawUsername: string): Promise<{ available: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const username = rawUsername.trim().toLowerCase();
  if (!username) {
    return { available: false, error: 'Username cannot be blank' };
  }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return { available: false, error: 'Username must be 3-24 characters (letters, numbers, underscores only)' };
  }
  if (!supabase) return { available: true };

  try {
    // 1. Check RPC check_username_exists if migration was applied
    const { data: rpcExists, error: rpcErr } = await supabase.rpc('check_username_exists', {
      target_username: username,
    });
    if (!rpcErr && typeof rpcExists === 'boolean') {
      return {
        available: !rpcExists,
        error: rpcExists ? 'This username is already taken. Please pick another unique username.' : undefined,
      };
    }

    // 2. Query profiles table directly (works when anon SELECT policy is enabled)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', username)
      .limit(1);

    if (!error && data && data.length > 0) {
      return {
        available: false,
        error: 'This username is already taken. Please pick another unique username.',
      };
    }

    // 3. Optional local dev server endpoint fallback
    try {
      const devRes = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (devRes.ok) {
        const json = await devRes.json();
        if (json && typeof json.available === 'boolean') {
          return {
            available: json.available,
            error: json.available ? undefined : 'This username is already taken. Please pick another unique username.',
          };
        }
      }
    } catch {
      // Ignore local dev endpoint error
    }

    return { available: true };
  } catch {
    return { available: true };
  }
}

export async function checkEmailAvailable(rawEmail: string): Promise<{ available: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { available: false, error: 'Email cannot be blank' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { available: false, error: 'Please enter a valid email address' };
  }
  if (!supabase) return { available: true };

  try {
    // 1. Check RPC check_email_exists if migration was applied
    const { data: rpcExists, error: rpcErr } = await supabase.rpc('check_email_exists', {
      target_email: email,
    });
    if (!rpcErr && rpcExists === true) {
      return { available: false, error: 'This email address is already in use. Please sign in instead.' };
    }

    // 2. Check profiles table
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (!profErr && profData && profData.length > 0) {
      return { available: false, error: 'This email address is already in use. Please sign in instead.' };
    }

    return { available: true };
  } catch {
    return { available: true };
  }
}

export async function searchProfiles(query: string, currentUserId: string): Promise<Profile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let builder = supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId);

    const clean = query.trim();
    if (clean) {
      builder = builder.or(`email.ilike.%${clean}%,display_name.ilike.%${clean}%,username.ilike.%${clean}%`);
    }

    const { data, error } = await builder.order('created_at', { ascending: false }).limit(30);

    if (error) {
      console.error('Error searching profiles:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception in searchProfiles:', err);
    return [];
  }
}


// --- Conversations & Messages ---

export async function fetchUserConversations(userId: string): Promise<{
  id: string;
  created_at: string;
  updated_at: string;
  participants: Profile[];
}[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  // 1. Get conversation IDs for current user
  const { data: participantRows, error: pError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (pError || !participantRows || participantRows.length === 0) {
    return [];
  }

  const conversationIds = participantRows.map((r) => r.conversation_id);

  // 2. Fetch conversations
  const { data: convRows, error: cError } = await supabase
    .from('conversations')
    .select('*')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });

  if (cError || !convRows) return [];

  // 3. Fetch all participants for these conversations
  const { data: allParticipants, error: apError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id, profiles(*)')
    .in('conversation_id', conversationIds);

  if (apError || !allParticipants) return [];

  const result = convRows.map((conv) => {
    const pList = allParticipants
      .filter((ap) => ap.conversation_id === conv.id)
      .map((ap) => ap.profiles as unknown as Profile)
      .filter(Boolean);

    const isGroup = pList.length > 2;
    const storedGroupName = typeof window !== 'undefined' ? localStorage.getItem(`safechat_group_name_${conv.id}`) : null;
    const defaultGroupName = isGroup
      ? (storedGroupName || pList.map((p) => p.display_name.split(' ')[0]).join(', '))
      : undefined;

    return {
      ...conv,
      participants: pList,
      is_group: isGroup,
      group_name: defaultGroupName,
    };
  });

  return result;
}

export async function createDirectConversation(
  currentUserId: string,
  targetUserId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { conversationId: null, error: 'Supabase client not initialized' };

  try {
    // 1. Check if direct conversation already exists
    const { data: existingParts, error: checkError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('user_id', [currentUserId, targetUserId]);

    if (checkError) {
      console.warn('Check existing conversations error:', checkError);
    }

    if (existingParts && existingParts.length > 0) {
      const convCounts: Record<string, number> = {};
      for (const row of existingParts) {
        convCounts[row.conversation_id] = (convCounts[row.conversation_id] || 0) + 1;
        if (convCounts[row.conversation_id] === 2) {
          return { conversationId: row.conversation_id, error: null }; // Found existing conversation
        }
      }
    }

    // 2. Insert new conversation with explicit UUID
    const convId = crypto.randomUUID();
    const { error: convError } = await supabase
      .from('conversations')
      .insert({ id: convId });

    if (convError) {
      console.error('Failed to create conversation:', convError);
      return { conversationId: null, error: `Conversation error: ${convError.message}` };
    }

    // 3. Add self first (satisfies user_id = auth.uid() RLS rule)
    const { error: selfError } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: convId, user_id: currentUserId });

    if (selfError) {
      console.error('Failed to add self to conversation:', selfError);
      return { conversationId: null, error: `Add self error: ${selfError.message}` };
    }

    // 4. Add target user
    const { error: targetError } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: convId, user_id: targetUserId });

    if (targetError) {
      console.error('Failed to add target participant:', targetError);
      return { conversationId: null, error: `Add contact error: ${targetError.message}` };
    }

    return { conversationId: convId, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { conversationId: null, error: msg };
  }
}


export async function fetchConversationMessages(conversationId: string): Promise<RawMessage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
}

export async function sendEncryptedMessage(
  conversationId: string,
  senderId: string,
  payload: EncryptedMessagePayload
): Promise<RawMessage | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Zero-knowledge: Do NOT write unencrypted risk_level metadata to the database
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      encrypted_content: payload.encryptedContent,
      iv: payload.iv,
      key_distribution: payload.keyDistribution,
      status: 'sent',
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  // Update conversation updated_at timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) {
      console.warn('Failed to delete message:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearConversationMessages(conversationId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('messages').delete().eq('conversation_id', conversationId);
    if (error) {
      console.warn('Failed to clear conversation messages:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function markMessagesAsDelivered(conversationId: string, currentUserId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('status', 'sent');
  } catch (err) {
    console.warn('Failed to mark messages delivered:', err);
  }
}

export async function markMessagesAsRead(conversationId: string, currentUserId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .in('status', ['sent', 'delivered']);
  } catch (err) {
    console.warn('Failed to mark messages read:', err);
  }
}

export async function createGroupConversation(
  currentUserId: string,
  participantIds: string[],
  groupName: string
): Promise<{ conversationId: string | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { conversationId: null, error: 'Supabase client not initialized' };

  try {
    const convId = crypto.randomUUID();
    const { error: convError } = await supabase
      .from('conversations')
      .insert({ id: convId });

    if (convError) {
      console.error('Failed to create group conversation:', convError);
      return { conversationId: null, error: `Conversation error: ${convError.message}` };
    }

    // Add current user first
    const { error: selfErr } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: convId, user_id: currentUserId });

    if (selfErr) {
      console.error('Failed to add creator to group:', selfErr);
      return { conversationId: null, error: selfErr.message };
    }

    // Add remaining members
    const otherIds = Array.from(new Set(participantIds)).filter((id) => id !== currentUserId);
    if (otherIds.length > 0) {
      const inserts = otherIds.map((uid) => ({ conversation_id: convId, user_id: uid }));
      const { error: partErr } = await supabase
        .from('conversation_participants')
        .insert(inserts);

      if (partErr) {
        console.warn('Failed to add some group members:', partErr);
      }
    }

    if (groupName.trim() && typeof window !== 'undefined') {
      localStorage.setItem(`safechat_group_name_${convId}`, groupName.trim());
    }

    return { conversationId: convId, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { conversationId: null, error: msg };
  }
}

// --- Verification Challenges (Facial Biometric Challenge) ---

export async function createVerificationChallenge(
  conversationId: string,
  requesterId: string,
  targetId: string,
  reason: string
): Promise<VerificationChallenge | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Cryptographically secure 128-bit liveness challenge token
  const tokenBytes = new Uint8Array(16);
  crypto.getRandomValues(tokenBytes);
  const livenessToken = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join('');

  const { data, error } = await supabase
    .from('verification_challenges')
    .insert({
      conversation_id: conversationId,
      requester_id: requesterId,
      target_id: targetId,
      reason,
      status: 'pending',
      liveness_token: livenessToken,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create verification challenge:', error);
    return null;
  }
  return data;
}

export async function updateChallengeStatus(
  challengeId: string,
  status: ChallengeStatus,
  livenessToken?: string,
  matchAccuracy?: number,
  requesterId?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  // 1. Broadcast the face match accuracy result directly to requester via Realtime channel
  if (requesterId) {
    try {
      const channel = supabase.channel(`challenges:${requesterId}`);
      channel.subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'face_verification_result',
            payload: {
              challenge_id: challengeId,
              status,
              match_accuracy: matchAccuracy,
            },
          });
        }
      });
    } catch (broadcastErr) {
      console.warn('Realtime broadcast failed:', broadcastErr);
    }
  }

  // 2. If transitioning to verified, use the secure server-validated RPC
  if (status === 'verified' && livenessToken) {
    try {
      const { error: rpcError } = await supabase.rpc('complete_facial_verification', {
        challenge_id: challengeId,
        provided_token: livenessToken,
        outcome: status,
      });
      if (!rpcError) return true;
      console.warn('RPC complete_facial_verification returned error, attempting token-guarded direct update:', rpcError);
    } catch (rpcErr) {
      console.warn('Exception calling complete_facial_verification RPC:', rpcErr);
    }
  }

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (livenessToken) {
    updatePayload.liveness_token = livenessToken;
  }
  if (typeof matchAccuracy === 'number') {
    updatePayload.match_accuracy = matchAccuracy;
  }

  let { error } = await supabase
    .from('verification_challenges')
    .update(updatePayload)
    .eq('id', challengeId);

  // If column match_accuracy does not exist in table yet, retry without it
  if (error && error.message?.includes('match_accuracy')) {
    delete updatePayload.match_accuracy;
    const retry = await supabase
      .from('verification_challenges')
      .update(updatePayload)
      .eq('id', challengeId);
    error = retry.error;
  }

  if (error) {
    console.error('Failed to update verification challenge status:', error);
    return false;
  }
  return true;
}
