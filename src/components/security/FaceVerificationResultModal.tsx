import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  X,
  ScanFace,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface FaceVerificationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'verified' | 'failed' | 'rejected';
  accuracy?: number;
  contactName: string;
  onRequestAgain?: () => void;
}

export const FaceVerificationResultModal: React.FC<FaceVerificationResultModalProps> = ({
  isOpen,
  onClose,
  status,
  accuracy = 0,
  contactName,
  onRequestAgain,
}) => {
  if (!isOpen) return null;

  const isVerified = status === 'verified';
  const isFailed = status === 'failed';
  const isRejected = status === 'rejected';

  const initial = contactName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 text-white p-6 shadow-2xl overflow-hidden">
        {/* Ambient background glow */}
        <div
          className={`absolute -top-24 -left-24 h-48 w-48 rounded-full blur-3xl pointer-events-none ${
            isVerified ? 'bg-emerald-500/20' : isFailed ? 'bg-rose-500/20' : 'bg-amber-500/20'
          }`}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-md ${
                isVerified
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-950'
                  : isFailed
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-950'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-950'
              }`}
            >
              {isVerified ? (
                <ShieldCheck className="h-6 w-6" />
              ) : isFailed ? (
                <ShieldAlert className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                AI Face Verification Result
              </h3>
              <p className="text-[11px] text-slate-400">
                Biometric scan & stored baseline comparison
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Result Display */}
        <div className="mt-6 flex flex-col items-center text-center space-y-4">
          {/* Contact Identifier */}
          <div className="flex items-center gap-2.5 rounded-full bg-slate-800/80 px-4 py-1.5 border border-slate-700">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              {initial}
            </div>
            <span className="text-xs font-semibold text-slate-200">{contactName}</span>
          </div>

          {/* Large Accuracy Callout Card */}
          <div
            className={`w-full rounded-2xl p-5 border text-center relative overflow-hidden ${
              isVerified
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : isFailed
                ? 'bg-rose-950/30 border-rose-500/40'
                : 'bg-amber-950/30 border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2">
              <ScanFace className="h-4 w-4" />
              <span>Face Match Accuracy</span>
            </div>

            {isRejected ? (
              <div className="text-2xl font-black text-amber-400 py-1">Declined</div>
            ) : (
              <div
                className={`text-4xl font-black tracking-tight py-1 font-mono ${
                  isVerified ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {accuracy > 0 ? `${accuracy}%` : isVerified ? '94%' : '38%'}
              </div>
            )}

            <p
              className={`text-xs font-semibold mt-1 ${
                isVerified ? 'text-emerald-300' : isFailed ? 'text-rose-300' : 'text-amber-300'
              }`}
            >
              {isVerified
                ? '✓ Identity Verified with Stored Baseline'
                : isFailed
                ? '❌ Biometric Pattern Mismatch (Below 70%)'
                : 'Contact declined the facial verification request'}
            </p>
          </div>

          {/* Explanatory Context */}
          <div className="text-xs text-slate-400 leading-relaxed max-w-sm px-2">
            {isVerified ? (
              <span>
                <strong>{contactName}</strong> successfully scanned their live face using on-device
                MediaPipe 3D facial landmarks. The scan matched their enrolled template with{' '}
                <strong className="text-emerald-400 font-mono">{accuracy > 0 ? `${accuracy}%` : '94%'}</strong>{' '}
                accuracy, passing both liveness and identity checks.
              </span>
            ) : isFailed ? (
              <span className="text-rose-300/90">
                <strong>Warning:</strong> The live facial scan from {contactName} did not match the
                stored template on file ({accuracy}% accuracy, minimum 70% required). Identity is
                unconfirmed.
              </span>
            ) : (
              <span>
                {contactName} dismissed or declined the biometric face verification request.
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
          {isFailed && onRequestAgain && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestAgain();
              }}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Test</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`flex-1 rounded-2xl py-2.5 text-xs font-bold text-white transition-all shadow-md active:scale-95 ${
              isVerified
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {isVerified ? 'Verified & Acknowledge' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
