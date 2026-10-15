import React from 'react';
import { Check, CheckCheck, Lock, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { DecryptedMessage } from '../../lib/types';


interface MessageBubbleProps {
  message: DecryptedMessage;
  isSelf: boolean;
  onInspectJury?: (message: DecryptedMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  onInspectJury,
}) => {
  const jury = message.juryResult;
  const isScam = jury?.verdict === 'SCAM';
  const isUncertain = jury?.verdict === 'UNCERTAIN';

  const timeFormatted = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full flex-col ${isSelf ? 'items-end' : 'items-start'} mb-3`}>
      {/* Scam / Uncertain Warning Banner (if flagged by AI Jury) */}
      {(isScam || isUncertain) && (
        <button
          type="button"
          onClick={() => onInspectJury && onInspectJury(message)}
          className={`mb-1.5 flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all max-w-[85%] md:max-w-[70%] text-left border ${
            isScam
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {isScam ? (
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <span className="flex-1 truncate">
            <strong>{isScam ? 'AI Jury Flagged Scam' : 'AI Jury Alert'}:</strong> {jury?.explanation}
          </span>
          <span className="text-[10px] underline underline-offset-2 shrink-0">
            Inspect Jury
          </span>
        </button>
      )}

      {/* Message Bubble Card */}
      <div
        className={`relative group max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
          isSelf
            ? 'bg-emerald-600 text-white rounded-br-xs'
            : isScam
            ? 'bg-slate-900 border border-rose-500/30 text-slate-100 rounded-bl-xs'
            : 'bg-slate-850 bg-slate-900/90 border border-slate-800/80 text-slate-100 rounded-bl-xs'
        }`}
      >
        {/* Message Plaintext */}
        <div className="text-xs md:text-sm leading-relaxed break-words whitespace-pre-wrap select-text">
          {message.decryptedText}
        </div>

        {/* Bubble Meta Footer */}
        <div
          className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
            isSelf ? 'text-emerald-100/80' : 'text-slate-400'
          }`}
        >
          {/* E2EE Lock Icon */}
          <span title="E2EE (AES-GCM 256)" className="opacity-80 hover:opacity-100">
            <Lock className="h-2.5 w-2.5 inline" />
          </span>

          {/* AI Jury Tag */}
          {jury && (
            <button
              onClick={() => onInspectJury && onInspectJury(message)}
              title="Click to view AI Jury breakdown"
              className="inline-flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity"
            >
              {isScam ? (
                <span className="text-rose-300 font-bold">SCAM</span>
              ) : isUncertain ? (
                <span className="text-amber-300 font-bold">UNCERTAIN</span>
              ) : (
                <span className="text-emerald-300 font-medium">SAFE</span>
              )}
            </button>
          )}

          {/* Timestamp */}
          <span>{timeFormatted}</span>

          {/* Message Status Checks (for self) */}
          {isSelf && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="h-3.5 w-3.5 text-cyan-200" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3.5 w-3.5 text-emerald-200" />
              ) : (
                <Check className="h-3.5 w-3.5 text-emerald-200" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
