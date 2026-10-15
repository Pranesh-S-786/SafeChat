import React, { useState } from 'react';
import { ShieldCheck, Video, CheckCircle2, Key } from 'lucide-react';
import type { Profile } from '../../lib/types';


interface ConversationHeaderProps {
  recipient: Profile;
  onOpenFaceVerification: () => void;
  hasPendingChallenge?: boolean;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  recipient,
  onOpenFaceVerification,
  hasPendingChallenge = false,
}) => {
  const [showKeyFingerprint, setShowKeyFingerprint] = useState(false);

  // Compute a displayable key fingerprint snippet
  const keySnippet = recipient.public_key
    ? recipient.public_key.substring(0, 16) + '...'
    : 'Generating key...';

  return (
    <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 md:px-6 backdrop-blur-xl">
      {/* Contact Profile Info */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-semibold text-sm">
            {recipient.display_name.charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">{recipient.display_name}</h2>
            <button
              onClick={() => setShowKeyFingerprint(!showKeyFingerprint)}
              title="Click to view E2EE Public Key Fingerprint"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>E2EE Active</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">{recipient.email}</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Facial Verification Challenge Trigger Button */}
        <button
          type="button"
          onClick={onOpenFaceVerification}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
            hasPendingChallenge
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
              : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 hover:bg-slate-700 hover:text-white'
          }`}
          title="Request biometric facial challenge to verify identity"
        >
          <Video className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">
            {hasPendingChallenge ? 'Challenge Active' : 'Face Verification'}
          </span>
        </button>
      </div>

      {/* Out-of-band Key Fingerprint Inspection Dialog */}
      {showKeyFingerprint && (
        <div className="absolute top-18 right-6 z-40 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Key className="h-3.5 w-3.5 text-emerald-400" />
              <span>Public Key Fingerprint</span>
            </div>
            <button
              onClick={() => setShowKeyFingerprint(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            Verify this fingerprint out-of-band with <strong>{recipient.display_name}</strong> to ensure protection against Man-in-the-Middle (MITM) attacks:
          </p>
          <div className="mt-2.5 rounded-lg bg-slate-950 p-2 font-mono text-[11px] text-emerald-400 border border-slate-800 break-all select-all">
            {keySnippet}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>RSA-OAEP 2048-bit with SHA-256</span>
          </div>
        </div>
      )}
    </div>
  );
};
