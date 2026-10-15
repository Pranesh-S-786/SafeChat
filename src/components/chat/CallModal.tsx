import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Profile } from '../../lib/types';
import { playRingingTone } from '../../lib/notifications';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Profile | null;
  callType: 'voice' | 'video';
  isGroup?: boolean;
  groupName?: string;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  recipient,
  callType,
  isGroup,
  groupName,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Ringing & Connection lifecycle
  useEffect(() => {
    if (!isOpen) {
      setCallStatus('ringing');
      setDuration(0);
      return;
    }

    setCallStatus('ringing');
    setDuration(0);

    const stopRinging = playRingingTone();

    // Transition from ringing to connected after 2.5 seconds
    const connectTimer = window.setTimeout(() => {
      stopRinging();
      setCallStatus('connected');
    }, 2800);

    return () => {
      stopRinging();
      clearTimeout(connectTimer);
    };
  }, [isOpen]);

  // Call duration counter
  useEffect(() => {
    if (callStatus !== 'connected') return;

    const interval = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  // Video / Audio device stream setup
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/Microphone access for call:', err);
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isOpen, callType]);

  const handleToggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = async () => {
    if (mediaStreamRef.current) {
      const vTracks = mediaStreamRef.current.getVideoTracks();
      if (vTracks.length > 0) {
        vTracks.forEach((t) => {
          t.enabled = !isVideoEnabled;
        });
        setIsVideoEnabled(!isVideoEnabled);
      } else if (!isVideoEnabled) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = vStream.getVideoTracks()[0];
          mediaStreamRef.current.addTrack(newTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = mediaStreamRef.current;
          }
          setIsVideoEnabled(true);
        } catch {
          // Camera unavailable
        }
      }
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  const displayName = isGroup ? (groupName || 'Group Call') : (recipient?.display_name || 'Contact');
  const initial = displayName.charAt(0).toUpperCase();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-between w-full max-w-md h-[580px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl shadow-2xl border border-slate-800 text-white overflow-hidden p-6 select-none">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-[11px] font-semibold border border-emerald-500/30">
            <Shield className="h-3.5 w-3.5" />
            <span>E2EE {callType === 'video' ? 'Video' : 'Voice'} Call</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-300">
              {callStatus === 'connected' ? formatTime(duration) : callStatus === 'ringing' ? 'Ringing...' : 'Call Ended'}
            </span>
          </div>
        </div>

        {/* Video stream canvas if Video Call */}
        {callType === 'video' && (
          <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <VideoOff className="h-12 w-12 stroke-[1.5]" />
                <span className="text-xs">Camera is paused</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/80 pointer-events-none" />
          </div>
        )}

        {/* Center Contact Info & Pulse Animation */}
        <div className="flex flex-col items-center text-center my-auto z-10 space-y-3">
          <div className="relative flex items-center justify-center">
            {callStatus === 'ringing' && (
              <div className="absolute h-32 w-32 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
            )}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-3xl shadow-xl shadow-emerald-900/40 border-2 border-emerald-400/40">
              {initial}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{displayName}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {callStatus === 'ringing'
                ? 'Securing connection...'
                : callStatus === 'connected'
                ? 'Connected • High Definition Audio'
                : 'Call Ended'}
            </p>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-around z-10 pt-4 border-t border-slate-800/80">
          {/* Mute button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
              isMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-slate-800/80 text-white hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Toggle Video button */}
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
              !isVideoEnabled
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-slate-800/80 text-white hover:bg-slate-700'
            }`}
            title={isVideoEnabled ? 'Disable Camera' : 'Enable Camera'}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Speaker toggle */}
          <button
            type="button"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
              isSpeakerOn
                ? 'bg-slate-800/80 text-white hover:bg-slate-700'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Audio Speaker"
          >
            {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/50 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
