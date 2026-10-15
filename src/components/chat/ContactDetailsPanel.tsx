import React from 'react';
import {
  X,
  Shield,
  UserCheck,
  Activity,
  Key,
  Video,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { KeystrokeRiskReport, Profile } from '../../lib/types';

interface ContactDetailsPanelProps {
  recipient: Profile;
  isOpen: boolean;
  onClose: () => void;
  onOpenFaceVerification: () => void;
  onOpenSecurityModal: () => void;
  keystrokeReport?: KeystrokeRiskReport | null;
}

export const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({
  recipient,
  isOpen,
  onClose,
  onOpenFaceVerification,
  onOpenSecurityModal,
  keystrokeReport,
}) => {
  if (!isOpen) return null;

  const initial = recipient.display_name.charAt(0).toUpperCase();

  // Genuine key snippet
  const keyFingerprint = recipient.public_key
    ? recipient.public_key.substring(0, 16) + '...'
    : 'No public key registered';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 md:static md:flex md:h-full md:w-80 shrink-0 flex-col border-l border-slate-200 bg-white overflow-y-auto custom-scrollbar select-none p-4 space-y-4 shadow-2xl md:shadow-none animate-in slide-in-from-right-4 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Contact Details & Security
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="flex flex-col items-center text-center pt-1 pb-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg mb-2 shadow-xs border border-emerald-200">
          {initial}
        </div>
        <h4 className="text-sm font-bold text-slate-900 leading-tight">{recipient.display_name}</h4>
        {recipient.username && (
          <span className="mt-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            @{recipient.username}
          </span>
        )}
        <p className="text-[11px] text-slate-500 mt-1">{recipient.email}</p>
      </div>

      {/* Genuine Security Status Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Shield className="h-3.5 w-3.5 fill-white" />
            </div>
            <span className="text-xs font-bold text-slate-900">Security Verification</span>
          </div>
          <button
            type="button"
            onClick={onOpenSecurityModal}
            className="text-[10px] font-semibold text-emerald-700 hover:underline"
          >
            Manage
          </button>
        </div>

        {/* Verification Subitems */}
        <div className="space-y-2.5 pt-1 text-xs">
          {/* Identity & Facial Biometrics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs font-medium text-slate-800">Biometric Identity</div>
                <div className="text-[10px] text-slate-500">
                  {recipient.face_enrolled ? 'Face template enrolled' : 'Not yet enrolled'}
                </div>
              </div>
            </div>
            {recipient.face_enrolled ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <HelpCircle className="h-4 w-4 text-slate-300" />
            )}
          </div>

          {/* Typing Dynamics (Keystroke) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <div>
                <div className="text-xs font-medium text-slate-800">Keystroke Dynamics</div>
                <div className="text-[10px] text-slate-500">
                  {keystrokeReport?.status === 'opted_out'
                    ? 'Monitoring inactive (Opted out)'
                    : !keystrokeReport?.isCalibrated
                    ? `Baseline learning (Msg ${keystrokeReport?.enrolledMessageCount || 0}/10)`
                    : keystrokeReport?.status === 'anomaly'
                    ? '10-msg baseline anomaly'
                    : '10-msg baseline active & matched'}
                </div>
              </div>
            </div>
            {keystrokeReport?.isRiskAlert ? (
              <AlertCircle className="h-4 w-4 text-rose-500" />
            ) : keystrokeReport?.status === 'opted_out' ? (
              <span className="h-2 w-2 rounded-full bg-slate-300" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>
        </div>
      </div>

      {/* Cryptographic Key Verification */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50 p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">Public Key Fingerprint</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Verify out-of-band to ensure protection against Man-in-the-Middle attacks:
        </p>
        <div className="rounded-lg bg-white p-2 font-mono text-[10px] text-emerald-700 border border-slate-200 break-all select-all">
          {keyFingerprint}
        </div>
      </div>

      {/* Action: Challenge */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onOpenFaceVerification}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
        >
          <Video className="h-4 w-4" />
          <span>Request Facial Verification</span>
        </button>
      </div>
    </div>
  );
};
