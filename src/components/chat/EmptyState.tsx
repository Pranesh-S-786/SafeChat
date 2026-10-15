import React from 'react';
import { Shield, Lock, Cpu, Fingerprint, Eye, Plus, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-conversation-selected' | 'no-conversations-at-all';
  onStartNewChat?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onStartNewChat }) => {
  if (type === 'no-conversations-at-all') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 mb-5 shadow-inner">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">No conversations yet</h3>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
          Your conversation list is empty. Start a new secure, end-to-end encrypted chat with another user by searching their email or display name.
        </p>
        {onStartNewChat && (
          <button
            onClick={onStartNewChat}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950 hover:bg-emerald-500 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Start First Chat
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-950/60 overflow-hidden">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900/90 border border-slate-800 text-emerald-400 shadow-2xl">
          <Shield className="h-10 w-10" />
        </div>

        <h2 className="text-xl font-bold text-slate-100">SafeChat Secure Workspace</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Select an ongoing conversation from the sidebar or initiate a new end-to-end encrypted session.
        </p>

        {/* Feature grid cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-2.5">
              <Lock className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-slate-200">Zero Server Plaintext</div>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              RSA-OAEP 2048 & AES-GCM 256. Database only holds ciphertext.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 mb-2.5">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-slate-200">AI Jury Ensemble</div>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              DT, NB, kNN & ANN local inference detects scam messages in-browser.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 mb-2.5">
              <Fingerprint className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-slate-200">Keystroke Dynamics</div>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Local dwell & flight temporal profiling detects takeover anomalies.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 mb-2.5">
              <Eye className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-slate-200">Consent Facial Verification</div>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Camera-consent biometric challenge protects critical identity alerts.
            </p>
          </div>
        </div>

        {onStartNewChat && (
          <div className="mt-8">
            <button
              onClick={onStartNewChat}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700/60 px-5 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700/80 hover:text-white transition-all"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              Start New Encrypted Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
