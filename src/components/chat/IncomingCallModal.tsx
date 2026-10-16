import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Shield } from 'lucide-react';
import { playRingingTone } from '../../lib/notifications';

interface IncomingCallModalProps {
  isOpen: boolean;
  caller: {
    id: string;
    display_name: string;
    avatar_url?: string;
  } | null;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  caller,
  callType,
  onAccept,
  onDecline,
}) => {
  // Ringing audio loop
  useEffect(() => {
    if (!isOpen) return;

    const stopRinging = playRingingTone();
    return () => {
      stopRinging();
    };
  }, [isOpen]);

  if (!isOpen || !caller) return null;

  const displayName = caller.display_name || 'Contact';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-between w-full max-w-sm h-[480px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl shadow-2xl border-2 border-emerald-500/40 text-white p-6 select-none overflow-hidden">
        
        {/* Glowing Pulse Background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="w-full flex items-center justify-center text-xs z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 px-3.5 py-1 text-[11px] font-semibold border border-emerald-500/30 shadow-xs">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>End-to-End Encrypted Incoming Call</span>
          </div>
        </div>

        {/* Center Caller Info & Animated Avatar */}
        <div className="flex flex-col items-center text-center my-auto z-10 space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Multiple pulsing rings */}
            <div className="absolute h-44 w-44 rounded-full bg-emerald-500/20 animate-ping duration-1000 pointer-events-none" />
            <div className="absolute h-36 w-36 rounded-full bg-teal-500/25 animate-pulse pointer-events-none" />

            {/* Caller Avatar */}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white font-black text-4xl shadow-2xl shadow-emerald-950/80 border-4 border-emerald-400/80 overflow-hidden">
              {caller.avatar_url ? (
                <img
                  src={caller.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-white">{displayName}</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
              {callType === 'video' ? (
                <>
                  <Video className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>Incoming Video Call...</span>
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>Incoming Voice Call...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Controls: Decline (Red) and Accept (Green) */}
        <div className="w-full flex items-center justify-around z-20 pt-4 border-t border-slate-800/80">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onDecline}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-xl shadow-rose-950/60 active:scale-95 cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
            <span className="text-[11px] font-semibold text-rose-300">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onAccept}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-950/80 active:scale-95 animate-bounce duration-700 cursor-pointer"
              title="Accept Call"
            >
              {callType === 'video' ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
            </button>
            <span className="text-[11px] font-semibold text-emerald-300">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
