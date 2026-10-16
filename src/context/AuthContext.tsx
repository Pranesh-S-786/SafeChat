import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  exportKeyBackup,
  getOrGenerateUserKeys,
  getStoredUserKeys,
  importKeyBackup,
} from '../lib/crypto';
import {
  enrollFaceProfile,
  getEnrolledFaceProfile,
} from '../lib/faceVerification';
import {
  fetchUserProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  saveSupabaseCredentials,
  updateUserProfile,
} from '../lib/supabase';
import type { KeyPairBundle, Profile } from '../lib/types';
import { sendOtpViaSmtp } from '../lib/smtp';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  keyPair: KeyPairBundle | null;
  isLoading: boolean;
  isConfigured: boolean;
  keyMismatchWarning: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    facePattern?: number[],
    username?: string
  ) => Promise<{ error?: string }>;
  sendOtp: (
    email: string,
    username?: string,
    displayName?: string,
    facePattern?: number[],
    password?: string
  ) => Promise<{ error?: string; otpCode: string; smtpSent?: boolean; smtpError?: string }>;
  verifyOtp: (
    email: string,
    token: string,
    registrationData?: {
      password?: string;
      displayName?: string;
      username?: string;
      facePattern?: number[];
    }
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
  updateConfig: (url: string, anonKey: string) => void;
  exportKeys: () => string | null;
  importKeys: (backupJson: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPairBundle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());
  const [keyMismatchWarning, setKeyMismatchWarning] = useState<boolean>(false);

  const initKeysAndProfile = useCallback(async (authUser: User) => {
    try {
      // 1. Fetch remote profile first to check if an established public_key already exists
      const existingProfile = await fetchUserProfile(authUser.id);

      // 2. Retrieve existing local keys from IndexedDB without generating new ones prematurely
      const existingLocalKeys = await getStoredUserKeys(authUser.id);

      let keys: KeyPairBundle;
      if (existingLocalKeys) {
        keys = existingLocalKeys;
        if (existingProfile?.public_key && existingProfile.public_key !== existingLocalKeys.publicKeyBase64) {
          console.warn('E2EE Key Warning: Local private key does not match remote published public key.');
        }
      } else {
        // Safe initial registration or sign-in on fresh device: generate and establish keypair
        keys = await getOrGenerateUserKeys(authUser.id);
      }

      setKeyPair(keys);
      setKeyMismatchWarning(false);

      // 3. Check if user has an enrolled face profile or pending pattern from account creation
      let faceProfile = getEnrolledFaceProfile(authUser.id);
      if (!faceProfile) {
        const pendingKey = `safechat_face_template_pending_${authUser.email?.toLowerCase().trim()}`;
        const pendingRaw = localStorage.getItem(pendingKey);
        if (pendingRaw) {
          try {
            const parsed = JSON.parse(pendingRaw);
            if (parsed?.templateVector && Array.isArray(parsed.templateVector)) {
              enrollFaceProfile(authUser.id, parsed.templateVector);
              faceProfile = getEnrolledFaceProfile(authUser.id);
              localStorage.removeItem(pendingKey);
            }
          } catch {
            // ignore
          }
        } else if (
          authUser.user_metadata?.face_template &&
          Array.isArray(authUser.user_metadata.face_template)
        ) {
          enrollFaceProfile(authUser.id, authUser.user_metadata.face_template);
          faceProfile = getEnrolledFaceProfile(authUser.id);
        }
      }

      // 4. Guarantee profile row is upserted in public.profiles
      const defaultName =
        authUser.user_metadata?.display_name ||
        authUser.email?.split('@')[0] ||
        'User';

      const defaultUsername =
        authUser.user_metadata?.username ||
        authUser.email?.split('@')[0] ||
        'user';

      const profileUpdates: Partial<Profile> = {
        email: authUser.email || '',
        display_name: defaultName,
        username: defaultUsername,
        face_enrolled: Boolean(faceProfile?.enrolled || existingProfile?.face_enrolled),
      };

      // Always synchronize this device's active public key to the remote profile
      // so other participants encrypt new messages using this device's active keypair!
      profileUpdates.public_key = keys.publicKeyBase64;
      if (existingProfile?.public_key && existingProfile.public_key !== keys.publicKeyBase64) {
        console.info('Updated remote public key to match active device keypair.');
      }

      const prof = await updateUserProfile(authUser.id, profileUpdates);
      setProfile(prof || existingProfile);
    } catch (err) {
      console.error('Error initializing user keys/profile:', err);
    }
  }, []);


  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await fetchUserProfile(user.id);
    if (prof) setProfile(prof);
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<Profile | null> => {
    if (!user) return null;
    const updated = await updateUserProfile(user.id, updates);
    if (updated) {
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      return updated;
    }
    // Optimistic fallback for local UI responsiveness if network error
    if (profile) {
      const optimistic: Profile = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setProfile(optimistic);
      return optimistic;
    }
    return null;
  }, [user, profile]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    setIsConfigured(isSupabaseConfigured());

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setKeyPair(null);
          setIsLoading(false);
          return;
        }
        setUser(session.user);
        initKeysAndProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setKeyPair(null);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        initKeysAndProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setKeyPair(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initKeysAndProfile]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: 'Supabase credentials are not configured yet.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    if (data.user) {
      setUser(data.user);
      await initKeysAndProfile(data.user);
    }
    return {};
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    facePattern?: number[],
    username?: string
  ): Promise<{ error?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: 'Supabase credentials are not configured yet.' };
    }

    const cleanUsername = (username || displayName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_')).trim();

    // Save pending face pattern under email key in case confirmation is required
    if (facePattern && facePattern.length > 0) {
      localStorage.setItem(
        `safechat_face_template_pending_${email.toLowerCase().trim()}`,
        JSON.stringify({
          enrolled: true,
          enrolledAt: new Date().toISOString(),
          templateVector: facePattern,
        })
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username: cleanUsername,
          face_template: facePattern || null,
          face_enrolled: Boolean(facePattern && facePattern.length > 0),
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      if (facePattern && facePattern.length > 0) {
        enrollFaceProfile(data.user.id, facePattern);
        localStorage.removeItem(`safechat_face_template_pending_${email.toLowerCase().trim()}`);
      }
      setUser(data.user);
      await initKeysAndProfile(data.user);
    }

    return {};
  };

  const sendOtp = async (
    email: string,
    username?: string,
    displayName?: string,
    facePattern?: number[],
    password?: string
  ): Promise<{ error?: string; otpCode: string; smtpSent?: boolean; smtpError?: string }> => {
    const cleanEmail = email.toLowerCase().trim();
    // Cryptographically secure 6-digit OTP
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otpCode = (100000 + (array[0] % 900000)).toString();

    // Store pending OTP session locally so user can verify via UI or preview in Email client
    sessionStorage.setItem(
      `safechat_pending_otp_${cleanEmail}`,
      JSON.stringify({
        code: otpCode,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000,
        username: username || cleanEmail.split('@')[0],
        displayName: displayName || cleanEmail.split('@')[0],
        facePattern: facePattern || null,
        password: password || undefined,
      })
    );

    // Save pending face pattern under email key in case confirmation/provisioning is used
    if (facePattern && facePattern.length > 0) {
      localStorage.setItem(
        `safechat_face_template_pending_${cleanEmail}`,
        JSON.stringify({
          enrolled: true,
          enrolledAt: new Date().toISOString(),
          templateVector: facePattern,
        })
      );
    }

    // Send real 6-digit OTP code using user's configured SMTP credentials
    const smtpRes = await sendOtpViaSmtp(cleanEmail, otpCode);

    return {
      otpCode,
      smtpSent: smtpRes.success,
      smtpError: smtpRes.error,
    };
  };

  const verifyOtp = async (
    email: string,
    token: string,
    registrationData?: {
      password?: string;
      displayName?: string;
      username?: string;
      facePattern?: number[];
    }
  ): Promise<{ error?: string }> => {
    const supabase = getSupabaseClient();
    const cleanEmail = email.toLowerCase().trim();
    const cleanToken = token.trim();

    const pendingRaw = sessionStorage.getItem(`safechat_pending_otp_${cleanEmail}`);
    let localValid = false;
    let cachedUsername = registrationData?.username;
    let cachedDisplayName = registrationData?.displayName;
    let cachedFacePattern = registrationData?.facePattern;
    let cachedPassword = registrationData?.password;

    if (pendingRaw) {
      try {
        const parsed = JSON.parse(pendingRaw);
        if (parsed.code === cleanToken && Date.now() <= parsed.expiresAt) {
          localValid = true;
          if (!cachedUsername) cachedUsername = parsed.username;
          if (!cachedDisplayName) cachedDisplayName = parsed.displayName;
          if (!cachedFacePattern) cachedFacePattern = parsed.facePattern;
          if (!cachedPassword && parsed.password) cachedPassword = parsed.password;
        }
      } catch {
        // ignore
      }
    }

    if (localValid) {
      sessionStorage.removeItem(`safechat_pending_otp_${cleanEmail}`);

      if (supabase && cachedPassword) {
        // Step 1: Attempt auto-provisioning via backend admin endpoint if service role key is set
        try {
          const provRes = await fetch('/api/auth/provision-verified-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: cachedPassword,
              displayName: cachedDisplayName || cleanEmail.split('@')[0],
              username: cachedUsername || cleanEmail.split('@')[0],
              facePattern: cachedFacePattern,
            }),
          });
          const provData = await provRes.json().catch(() => ({}));
          if (provData?.provisioned) {
            const directSign = await signIn(cleanEmail, cachedPassword);
            if (!directSign.error) {
              return {};
            }
          }
        } catch {
          // Continue to regular sign up / sign in
        }

        // Step 2: Standard Supabase signUp attempt
        const res = await signUp(
          cleanEmail,
          cachedPassword,
          cachedDisplayName || cleanEmail.split('@')[0],
          cachedFacePattern,
          cachedUsername
        );

        if (res.error && (res.error.includes('already registered') || res.error.includes('User already registered'))) {
          // Attempt RPC password sync in case 20261015_sync_otp_user.sql was applied
          try {
            await supabase.rpc('sync_otp_user', {
              target_email: cleanEmail,
              target_password: cachedPassword,
            });
          } catch {
            // ignore
          }

          const signRes = await signIn(cleanEmail, cachedPassword);
          if (signRes.error) {
            return {
              error:
                'Code verified! However, this email was already registered in Supabase from prior testing with a different password. Please run the sync_otp_user.sql script in Supabase SQL editor or sign in with your original password.',
            };
          }
        } else if (res.error) {
          return { error: res.error };
        }
      } else if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
          await initKeysAndProfile(data.user);
        }
      }
      return {};
    }

    return { error: 'Invalid or expired 6-digit verification code. Please check your email or resend code.' };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setKeyPair(null);
  };

  const exportKeys = (): string | null => {
    if (!keyPair) return null;
    return exportKeyBackup(keyPair);
  };

  const importKeys = async (backupJson: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User must be signed in to import keys.' };
    try {
      const restored = await importKeyBackup(user.id, backupJson);
      setKeyPair(restored);
      setKeyMismatchWarning(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const updateConfig = (url: string, anonKey: string) => {
    saveSupabaseCredentials(url, anonKey);
    setIsConfigured(isSupabaseConfigured());
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        keyPair,
        isLoading,
        isConfigured,
        keyMismatchWarning,
        signIn,
        signUp,
        sendOtp,
        verifyOtp,
        signOut,
        refreshProfile,
        updateProfile,
        updateConfig,
        exportKeys,
        importKeys,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
