import React, { useRef, useEffect, useState } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { AIJuryModal } from '../security/AIJuryModal';
import { FaceVerificationModal } from '../security/FaceVerificationModal';
import type { AIJuryResult, ChallengeStatus, Conversation, DecryptedMessage, Profile, VerificationChallenge } from '../../lib/types';
import { Lock } from 'lucide-react';


interface ChatAreaProps {
  conversation: Conversation;
  messages: DecryptedMessage[];
  currentUserId: string;
  onSendMessage: (text: string, juryResult: AIJuryResult) => Promise<void>;
  onSendChallenge?: (reason: string) => Promise<void>;
  onUpdateChallengeStatus?: (status: ChallengeStatus, accuracyPercentage?: number) => Promise<void>;
  activeChallenge: VerificationChallenge | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onSendChallenge,
  onUpdateChallengeStatus,
  activeChallenge,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedJuryMessage, setSelectedJuryMessage] = useState<DecryptedMessage | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  // Recipient is the other participant
  const recipient = conversation.participants.find((p) => p.id !== currentUserId) || {
    id: 'unknown',
    email: 'recipient@safechat.io',
    display_name: 'Recipient',
  } as Profile;

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInspectJury = (msg: DecryptedMessage) => {
    setSelectedJuryMessage(msg);
  };

  const handleTriggerFaceChallenge = () => {
    setIsFaceModalOpen(true);
    if (onSendChallenge) {
      onSendChallenge('Keystroke Behavioral Anomaly Detected in Active Typing Session');
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-slate-950 overflow-hidden">
      {/* Conversation Top Header */}
      <ConversationHeader
        recipient={recipient}
        onOpenFaceVerification={() => setIsFaceModalOpen(true)}
        hasPendingChallenge={Boolean(activeChallenge && activeChallenge.status === 'pending')}
      />

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {/* E2EE Channel Encryption Guarantee Banner */}
        <div className="mx-auto mb-6 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-2.5 text-center text-[11px] text-slate-400 backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>
            Messages are end-to-end encrypted with <strong>AES-GCM-256</strong>. Only you and <strong>{recipient.display_name}</strong> hold the decryption keys.
          </span>
        </div>

        {/* Render Messages */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.sender_id === currentUserId}
            onInspectJury={handleInspectJury}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer
        userId={currentUserId}
        onSendMessage={onSendMessage}
        onTriggerFaceChallenge={handleTriggerFaceChallenge}
      />

      {/* AI Jury Modal */}
      {selectedJuryMessage && (
        <AIJuryModal
          isOpen={Boolean(selectedJuryMessage)}
          onClose={() => setSelectedJuryMessage(null)}
          result={selectedJuryMessage.juryResult || null}
          messageText={selectedJuryMessage.decryptedText}
        />
      )}

      {/* Facial Verification Modal */}
      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        userId={currentUserId}
        isRequester={Boolean(activeChallenge?.requester_id === currentUserId)}
        challenge={activeChallenge}
        onUpdateStatus={onUpdateChallengeStatus}
      />
    </div>
  );
};
