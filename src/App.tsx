import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { NavigationRail } from './components/layout/NavigationRail';
import { ConversationList } from './components/chat/ConversationList';
import { ChatMain } from './components/chat/ChatMain';
import { ContactDetailsPanel } from './components/chat/ContactDetailsPanel';
import { AIJuryModal } from './components/security/AIJuryModal';
import { FaceVerificationModal } from './components/security/FaceVerificationModal';
import { FaceVerificationResultModal } from './components/security/FaceVerificationResultModal';
import { SecuritySettingsModal } from './components/security/SecuritySettingsModal';
import { SupabaseConfigModal } from './components/auth/SupabaseConfigModal';
import { NewChatModal } from './components/chat/NewChatModal';
import { SuspiciousTypingAlertModal } from './components/security/SuspiciousTypingAlertModal';
import { FaceLockScreen } from './components/security/FaceLockScreen';
import { ProfileModal } from './components/profile/ProfileModal';
import { getEnrolledFaceProfile } from './lib/faceVerification';
import {
  createVerificationChallenge,
  fetchConversationMessages,
  fetchUserConversations,
  fetchUserProfile,
  getSupabaseClient,
  markMessagesAsDelivered,
  markMessagesAsRead,
  deleteMessage,
  sendEncryptedMessage,
  updateChallengeStatus,
} from './lib/supabase';
import { decryptMessage, encryptMessageForParticipants } from './lib/crypto';
import { evaluateMessageWithAIJury } from './lib/aiJury';
import {
  playMessageChime,
  requestNotificationPermission,
  showDesktopNotification,
} from './lib/notifications';
import type {
  AIJuryResult,
  ChallengeStatus,
  Conversation,
  DecryptedMessage,
  FileMetadata,
  KeystrokeRiskReport,
  MessageType,
  RawMessage,
  VerificationChallenge,
} from './lib/types';

const SafeChatProductionApp: React.FC = () => {
  const { user, keyPair, isLoading } = useAuth();

  // Landing page vs app view state
  const [viewMode, setViewMode] = useState<'landing' | 'auth' | 'app'>('landing');

  // Navigation tab state
  const [activeNavTab, setActiveNavTab] = useState<'chats' | 'contacts' | 'security' | 'settings'>('chats');

  // Real Database Conversations & Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Face lock state at application launch/refresh
  const [isFaceUnlocked, setIsFaceUnlocked] = useState(false);

  // Collapsible right panel state
  const [isSecurityPanelOpen, setIsSecurityPanelOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1280
  );

  // Live Keystroke Dynamics Report
  const [keystrokeReport, setKeystrokeReport] = useState<KeystrokeRiskReport | null>(null);

  // Modals state
  const [selectedJuryMessage, setSelectedJuryMessage] = useState<DecryptedMessage | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<VerificationChallenge | null>(null);
  const [dismissedAnomaliesBySender, setDismissedAnomaliesBySender] = useState<Record<string, number>>({});
  const [faceResultNotification, setFaceResultNotification] = useState<{
    status: 'verified' | 'failed' | 'rejected';
    accuracy: number;
    contactName: string;
  } | null>(null);

  // Browser History & Navigation Support (Back button & hash navigation)
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setActiveNavTab('chats');
    if (window.location.hash !== `#chat=${id}`) {
      window.history.pushState({ conversationId: id }, '', `#chat=${id}`);
    }
  }, []);

  const handleBackFromChat = useCallback(() => {
    setSelectedConversationId(null);
    if (window.location.hash.startsWith('#chat=')) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const match = window.location.hash.match(/chat=([^&]+)/);
      if (match && match[1]) {
        setSelectedConversationId(match[1]);
      } else {
        setSelectedConversationId(null);
      }
    };

    window.addEventListener('popstate', syncFromHash);
    window.addEventListener('hashchange', syncFromHash);
    syncFromHash();

    return () => {
      window.removeEventListener('popstate', syncFromHash);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  // Request browser notification permissions
  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  // 1. Fetch real conversations from Supabase
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setIsLoadingConversations(true);
    setConversationsError(null);
    try {
      const list = await fetchUserConversations(user.id);
      setConversations(list);
      // Mark received messages across conversations as delivered to this device
      for (const c of list) {
        markMessagesAsDelivered(c.id, user.id);
      }
    } catch (err: unknown) {
      console.error('Failed to load conversations:', err);
      setConversationsError('Could not fetch conversations from database.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  const initialEnrollmentCheckedRef = useRef(false);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Auto prompt first-time sign-in face biometric enrollment
  useEffect(() => {
    if (!isLoading && user && !initialEnrollmentCheckedRef.current) {
      initialEnrollmentCheckedRef.current = true;
      const enrolled = getEnrolledFaceProfile(user.id);
      if (!enrolled) {
        setActiveChallenge(null);
        setIsFaceModalOpen(true);
      }
    }
  }, [user, isLoading]);

  // Selected conversation object
  const activeConversation = conversations.find((c) => c.id === selectedConversationId) || null;
  const recipient = activeConversation?.participants.find((p) => p.id !== user?.id) || null;

  // 2. Fetch and decrypt real messages when conversation changes
  const loadMessages = useCallback(
    async (convId: string) => {
      if (!user || !keyPair) return;
      setIsLoadingMessages(true);
      try {
        const rawList = await fetchConversationMessages(convId);
        const decryptedList: DecryptedMessage[] = [];

        for (const raw of rawList) {
          let text = '[Encrypted Message]';
          let isDecrypted = false;
          let keystrokeAnomaly = false;
          let messageType: MessageType = 'text';
          let fileMetadata: FileMetadata | undefined = undefined;

          let cachedRaw: string | null = null;
          try {
            cachedRaw = localStorage.getItem(`safechat_cached_msg_${raw.id}`);
          } catch {
            // ignore
          }

          if (cachedRaw) {
            try {
              const parsedCache = JSON.parse(cachedRaw);
              if (parsedCache && typeof parsedCache === 'object' && parsedCache.text !== undefined) {
                text = parsedCache.text || '';
                messageType = parsedCache.type || 'text';
                fileMetadata = parsedCache.fileMetadata;
                keystrokeAnomaly = Boolean(parsedCache.keystrokeAnomaly);
                isDecrypted = true;
              } else {
                cachedRaw = null;
              }
            } catch {
              cachedRaw = null;
            }
          }

          if (!cachedRaw) {
            try {
              const rawDecrypted = await decryptMessage(
                raw.encrypted_content,
                raw.iv,
                raw.key_distribution,
                user.id,
                keyPair.privateKeyJwk
              );
              isDecrypted = true;
              try {
                const parsed = JSON.parse(rawDecrypted);
                if (parsed && typeof parsed === 'object') {
                  text = parsed.text || '';
                  keystrokeAnomaly = Boolean(parsed.keystrokeAnomaly);
                  messageType = parsed.type || 'text';
                  fileMetadata = parsed.fileMetadata;
                } else {
                  text = rawDecrypted;
                }
              } catch {
                text = rawDecrypted;
              }
              try {
                localStorage.setItem(
                  `safechat_cached_msg_${raw.id}`,
                  JSON.stringify({
                    text,
                    type: messageType,
                    fileMetadata,
                    keystrokeAnomaly,
                  })
                );
              } catch {
                // ignore
              }
            } catch (decryptErr) {
              console.warn('Could not decrypt message:', decryptErr);
              text = '[Encrypted Message - Key not found on device]';
            }
          }

          // AI safety detection is strictly done on RECEIVED messages, NEVER on sending!
          const isIncoming = raw.sender_id !== user.id;
          const juryResult = (isDecrypted && isIncoming)
            ? await evaluateMessageWithAIJury(text)
            : undefined;

          decryptedList.push({
            ...raw,
            decryptedText: text,
            isDecrypted,
            messageType,
            fileMetadata,
            juryResult,
            keystrokeAnomaly,
          });
        }

        setMessages(decryptedList);

        // Mark incoming messages as read
        markMessagesAsRead(convId, user.id);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [user, keyPair]
  );

  useEffect(() => {
    if (selectedConversationId && user) {
      loadMessages(selectedConversationId);
      markMessagesAsRead(selectedConversationId, user.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId, user, loadMessages]);

  // 3. Supabase Realtime subscription for live incoming messages & status ticks
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !selectedConversationId || !user || !keyPair) return;

    const channelName = `chat:${selectedConversationId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async (payload) => {
          const newRaw = payload.new as RawMessage;
          if (!newRaw || !newRaw.id) return;

          // Senders already have their own message displayed optimistically
          if (newRaw.sender_id === user.id) {
            return;
          }

          let text = '[Encrypted Message]';
          let isDecrypted = false;
          let keystrokeAnomaly = false;
          let messageType: MessageType = 'text';
          let fileMetadata: FileMetadata | undefined = undefined;

          try {
            const rawDecrypted = await decryptMessage(
              newRaw.encrypted_content,
              newRaw.iv,
              newRaw.key_distribution,
              user.id,
              keyPair.privateKeyJwk
            );
            isDecrypted = true;
            try {
              const parsed = JSON.parse(rawDecrypted);
              if (parsed && typeof parsed === 'object') {
                text = parsed.text || '';
                keystrokeAnomaly = Boolean(parsed.keystrokeAnomaly);
                messageType = parsed.type || 'text';
                fileMetadata = parsed.fileMetadata;
              } else {
                text = rawDecrypted;
              }
            } catch {
              text = rawDecrypted;
            }
            try {
              localStorage.setItem(
                `safechat_cached_msg_${newRaw.id}`,
                JSON.stringify({
                  text,
                  type: messageType,
                  fileMetadata,
                  keystrokeAnomaly,
                })
              );
            } catch {
              // ignore
            }
          } catch (err) {
            console.warn('Realtime message decryption error:', err);
          }

          // Evaluate AI Jury ONLY on receiving message
          const juryResult = isDecrypted ? await evaluateMessageWithAIJury(text) : undefined;

          // Play incoming notification chime & show desktop notification
          playMessageChime();
          showDesktopNotification('SafeChat', {
            body: text.startsWith('📎') ? 'Sent an attachment' : text,
          });

          // Mark message as read since user is actively in this conversation
          markMessagesAsRead(selectedConversationId, user.id);

          const decryptedItem: DecryptedMessage = {
            ...newRaw,
            decryptedText: text,
            isDecrypted,
            messageType,
            fileMetadata,
            juryResult,
            keystrokeAnomaly,
          };

          setMessages((current) => {
            if (current.some((m) => m.id === decryptedItem.id)) return current;
            return [...current, decryptedItem];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const updated = payload.new as RawMessage;
          if (!updated || !updated.id) return;

          // Updates sender's ticks from single grey to double grey and double blue ticks!
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, status: updated.status } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, user, keyPair]);

  // 4. Send Message Handler (E2EE Client Encryption)
  const isMessageSendingRef = useRef(false);
  const handleSendMessage = async (
    text: string,
    _unusedJuryResult?: AIJuryResult,
    keystrokeAnomaly: boolean = false,
    messageType: MessageType = 'text',
    fileMetadata?: FileMetadata
  ) => {
    if (!user || !activeConversation || !keyPair) return;
    if (isMessageSendingRef.current) return;

    isMessageSendingRef.current = true;
    try {
      // Gather public keys for all participants (supports direct and group chats)
      const participantsForEncryption: { userId: string; publicKeyBase64: string }[] = [];

      for (const p of activeConversation.participants) {
        let pubKey = p.public_key;
        if (p.id === user.id) {
          pubKey = keyPair.publicKeyBase64;
        } else {
          const freshProfile = await fetchUserProfile(p.id);
          if (freshProfile?.public_key) {
            pubKey = freshProfile.public_key;
          }
        }

        if (pubKey) {
          participantsForEncryption.push({ userId: p.id, publicKeyBase64: pubKey });
        }
      }

      // Unconditionally guarantee sender's own active public key is included in the encrypted envelope
      if (!participantsForEncryption.some((p) => p.userId === user.id) && keyPair.publicKeyBase64) {
        participantsForEncryption.push({ userId: user.id, publicKeyBase64: keyPair.publicKeyBase64 });
      }

      if (participantsForEncryption.length === 0) {
        alert('Could not resolve participant public keys for end-to-end encryption.');
        return;
      }

      // Encrypt client-side payload E2EE
      const payloadPlaintext = JSON.stringify({
        text,
        type: messageType,
        fileMetadata,
        keystrokeAnomaly,
      });
      const encryptedPayload = await encryptMessageForParticipants(payloadPlaintext, participantsForEncryption);

      // Save encrypted ciphertext in Supabase (status defaults to 'sent' = single grey tick)
      const sent = await sendEncryptedMessage(
        activeConversation.id,
        user.id,
        encryptedPayload
      );

      if (sent) {
        try {
          localStorage.setItem(
            `safechat_cached_msg_${sent.id}`,
            JSON.stringify({
              text,
              type: messageType,
              fileMetadata,
              keystrokeAnomaly,
            })
          );
        } catch {
          // ignore
        }
        const optimisticMsg: DecryptedMessage = {
          ...sent,
          decryptedText: text,
          isDecrypted: true,
          messageType,
          fileMetadata,
          juryResult: undefined, // Senders do NOT get AI safety detection badges on sent messages!
          keystrokeAnomaly,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, optimisticMsg];
        });
        loadConversations();
      }
    } finally {
      isMessageSendingRef.current = false;
    }
  };

  // Delete individual unreadable or unwanted message
  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      localStorage.removeItem(`safechat_cached_msg_${messageId}`);
    } catch {
      // ignore
    }
  };

  // Clean up legacy messages encrypted with previous reset session keys
  const handleClearLegacyMessages = async () => {
    if (!selectedConversationId) return;
    const legacyMsgs = messages.filter(
      (m) => m.decryptedText === '[Encrypted Message - Key not found on device]'
    );
    for (const m of legacyMsgs) {
      await deleteMessage(m.id);
      try {
        localStorage.removeItem(`safechat_cached_msg_${m.id}`);
      } catch {
        // ignore
      }
    }
    setMessages((prev) =>
      prev.filter((m) => m.decryptedText !== '[Encrypted Message - Key not found on device]')
    );
  };

  // 5. Verification Challenges
  const handleOpenFaceVerification = async () => {
    if (user && activeConversation && recipient) {
      const challenge = await createVerificationChallenge(
        activeConversation.id,
        user.id,
        recipient.id,
        JSON.stringify({
          message: 'Biometric Facial Verification Challenge Requested by contact',
        })
      );
      if (challenge) {
        alert(`Facial verification challenge sent to ${recipient.display_name}! They will be prompted to verify their face on their device.`);
      }
    } else if (user) {
      setActiveChallenge(null);
      setIsFaceModalOpen(true);
    }
  };

  const handleUpdateChallengeStatus = async (status: ChallengeStatus, accuracyPercentage?: number) => {
    if (!activeChallenge) return;
    await updateChallengeStatus(
      activeChallenge.id,
      status,
      activeChallenge.liveness_token,
      accuracyPercentage,
      activeChallenge.requester_id
    );
    setActiveChallenge((prev) => (prev ? { ...prev, status } : null));
  };

  // Listen for incoming facial verification challenges & result notifications
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const handleResultReceived = (
      status: 'verified' | 'failed' | 'rejected',
      matchAccuracy?: number,
      targetId?: string
    ) => {
      let contactName = 'Contact';
      if (targetId) {
        const found = conversations
          .flatMap((c) => c.participants)
          .find((p) => p.id === targetId);
        if (found) contactName = found.display_name;
      }
      if (contactName === 'Contact' && recipient) {
        contactName = recipient.display_name;
      }

      const accuracy =
        typeof matchAccuracy === 'number'
          ? matchAccuracy
          : status === 'verified'
          ? 94
          : status === 'failed'
          ? 38
          : 0;

      setFaceResultNotification({
        status,
        accuracy,
        contactName,
      });

      playMessageChime();
      showDesktopNotification('AI Face Verification Result', {
        body: `${contactName}: ${status === 'verified' ? 'Passed' : status === 'failed' ? 'Failed' : 'Declined'} with ${accuracy}% face match accuracy`,
      });
    };

    const challengeChannel = supabase
      .channel(`challenges:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'verification_challenges',
          filter: `target_id=eq.${user.id}`,
        },
        (payload) => {
          const newChallenge = payload.new as VerificationChallenge;
          if (newChallenge && newChallenge.status === 'pending') {
            setActiveChallenge(newChallenge);
            setIsFaceModalOpen(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'verification_challenges',
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as VerificationChallenge;
          if (updated && updated.status && updated.status !== 'pending') {
            handleResultReceived(
              updated.status as 'verified' | 'failed' | 'rejected',
              updated.match_accuracy,
              updated.target_id
            );
          }
        }
      )
      .on(
        'broadcast',
        { event: 'face_verification_result' },
        (event) => {
          const payload = event.payload as {
            challenge_id?: string;
            status: 'verified' | 'failed' | 'rejected';
            match_accuracy?: number;
            target_id?: string;
          };
          if (payload && payload.status) {
            handleResultReceived(
              payload.status,
              payload.match_accuracy,
              payload.target_id
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [user, conversations, recipient]);

  // Count suspicious typing messages from active recipient
  const suspiciousFromSenderCount = recipient
    ? messages.filter((m) => m.sender_id === recipient.id && m.keystrokeAnomaly).length
    : 0;

  const isSuspiciousAlertModalOpen =
    Boolean(recipient) &&
    suspiciousFromSenderCount >= 3 &&
    (dismissedAnomaliesBySender[recipient!.id] || 0) < suspiciousFromSenderCount;

  const handleAssignFaceTestToSender = async (
    customVector?: number[],
    photoPreview?: string
  ) => {
    if (!recipient || !activeConversation || !user) return;
    setDismissedAnomaliesBySender((prev) => ({
      ...prev,
      [recipient.id]: suspiciousFromSenderCount,
    }));

    const reasonPayload = customVector
      ? JSON.stringify({
          message: 'Face verification challenge: Reference photo match required',
          customReferenceVector: customVector,
          photoPreview,
        })
      : JSON.stringify({
          message: '3 Suspicious typing pattern warnings detected - Facial check against stored pattern required',
        });

    await createVerificationChallenge(
      activeConversation.id,
      user.id,
      recipient.id,
      reasonPayload
    );
  };

  const handleCancelFaceTest = () => {
    if (!recipient) return;
    setDismissedAnomaliesBySender((prev) => ({
      ...prev,
      [recipient.id]: suspiciousFromSenderCount,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-emerald-700">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">
            Connecting to SafeChat...
          </span>
        </div>
      </div>
    );
  }

  // Unauthenticated user: Show Landing Page by default, or AuthModal when user clicks Get Started
  if (!user) {
    if (viewMode === 'auth') {
      return <AuthModal onBackToLanding={() => setViewMode('landing')} />;
    }
    return <LandingPage onGetStarted={() => setViewMode('auth')} />;
  }

  // Face lock verification on every application opening and page refresh
  if (user && !isFaceUnlocked) {
    return <FaceLockScreen userId={user.id} onUnlock={() => setIsFaceUnlocked(true)} />;
  }

  // Authenticated user viewing Landing Page
  if (viewMode === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setViewMode('app')}
        isSignedIn={true}
        onEnterApp={() => setViewMode('app')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden pastel-aurora-bg font-sans text-slate-800 antialiased">
      {/* Column 1: Navigation Rail */}
      <NavigationRail
        activeTab={activeNavTab}
        hasActiveChat={Boolean(selectedConversationId)}
        onSelectTab={(tab) => {
          setActiveNavTab(tab);
          if (tab === 'chats') {
            handleBackFromChat();
          }
        }}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
        onOpenLanding={() => setViewMode('landing')}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenFaceTest={() => {
          setActiveChallenge(null);
          setIsFaceModalOpen(true);
        }}
      />

      {/* Column 2: Genuine Conversation List */}
      <div
        className={`h-full ${
          selectedConversationId
            ? 'hidden md:flex md:w-80 md:w-88 shrink-0'
            : 'flex flex-1 md:flex-initial md:w-80 md:w-88 h-full pb-14 md:pb-0'
        }`}
      >
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => setIsNewChatModalOpen(true)}
          isLoading={isLoadingConversations}
          error={conversationsError}
        />
      </div>

      {/* Column 3: Main Chat Area */}
      <main
        className={`flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 h-full ${
          selectedConversationId ? 'flex' : 'hidden md:flex'
        }`}
      >
        <ChatMain
          conversation={activeConversation}
          messages={messages}
          currentUserId={user.id}
          onSendMessage={handleSendMessage}
          onOpenVideoChallenge={handleOpenFaceVerification}
          onTestMyFace={() => {
            setActiveChallenge(null);
            setIsFaceModalOpen(true);
          }}
          onToggleSecurityPanel={() => setIsSecurityPanelOpen(!isSecurityPanelOpen)}
          onInspectJury={(msg) => setSelectedJuryMessage(msg)}
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
          isLoadingMessages={isLoadingMessages}
          onKeystrokeUpdate={setKeystrokeReport}
          onBack={handleBackFromChat}
          onDeleteMessage={handleDeleteMessage}
          onClearLegacyMessages={handleClearLegacyMessages}
        />
      </main>

      {/* Column 4: Collapsible Genuine Contact & Security Details Panel */}
      {recipient && (
        <ContactDetailsPanel
          recipient={recipient}
          isOpen={isSecurityPanelOpen}
          onClose={() => setIsSecurityPanelOpen(false)}
          onOpenFaceVerification={handleOpenFaceVerification}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          keystrokeReport={keystrokeReport}
        />
      )}

      {/* Modals */}
      {/* 1. AI Jury Deliberation Modal */}
      {selectedJuryMessage && (
        <AIJuryModal
          isOpen={Boolean(selectedJuryMessage)}
          onClose={() => setSelectedJuryMessage(null)}
          result={selectedJuryMessage.juryResult || null}
          messageText={selectedJuryMessage.decryptedText}
        />
      )}

      {/* 2. Consent-Based Facial Verification Modal */}
      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        userId={user.id}
        challenge={activeChallenge}
        onUpdateStatus={handleUpdateChallengeStatus}
      />

      {/* 3. Security & Privacy Center Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onOpenFaceEnroll={() => {
          setIsSecurityModalOpen(false);
          setIsFaceModalOpen(true);
        }}
      />

      {/* 4. Supabase Backend Settings Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* 5. Start New Chat & Group Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => {
          setIsNewChatModalOpen(false);
          loadConversations();
        }}
        onSelectConversation={(id) => {
          handleSelectConversation(id);
          setIsNewChatModalOpen(false);
          loadConversations();
        }}
      />

      {/* 6. Profile & Avatar Customization Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          loadConversations();
        }}
      />

      {/* 7. Suspicious Typing Alert Modal (Triggered after 3 warnings) */}
      {recipient && (
        <SuspiciousTypingAlertModal
          isOpen={isSuspiciousAlertModalOpen}
          senderName={recipient.display_name}
          count={suspiciousFromSenderCount}
          onAssignTest={handleAssignFaceTestToSender}
          onCancel={handleCancelFaceTest}
        />
      )}

      {/* 8. AI Face Verification Match Accuracy Result Modal (For Requester) */}
      {faceResultNotification && (
        <FaceVerificationResultModal
          isOpen={Boolean(faceResultNotification)}
          onClose={() => setFaceResultNotification(null)}
          status={faceResultNotification.status}
          accuracy={faceResultNotification.accuracy}
          contactName={faceResultNotification.contactName}
          onRequestAgain={() => {
            setFaceResultNotification(null);
            handleOpenFaceVerification();
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SafeChatProductionApp />
    </AuthProvider>
  );
}
