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
  AlertTriangle,
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
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioBars, setAudioBars] = useState<number[]>([6, 12, 18, 24, 16, 28, 20, 14, 22, 10, 15, 8]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Ringing & Connection lifecycle
  useEffect(() => {
    if (!isOpen) {
      setCallStatus('ringing');
      setDuration(0);
      setMediaError(null);
      return;
    }

    setCallStatus('ringing');
    setDuration(0);
    setMediaError(null);

    const stopRinging = playRingingTone();

    // Transition from ringing to connected after 2.4 seconds
    const connectTimer = window.setTimeout(() => {
      stopRinging();
      setCallStatus('connected');
    }, 2400);

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

  // Video / Audio device stream setup & Real-time Web Audio Analyser
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initMedia() {
      setMediaError(null);
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

        // Attach stream to local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Setup Web Audio API Analyser for real-time live microphone visualizer waves
        try {
          const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtxClass) {
            const audioCtx = new AudioCtxClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const updateVisualizer = () => {
              if (!isMounted) return;
              if (analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                const bars: number[] = [];
                const step = Math.max(1, Math.floor(dataArray.length / 12));
                for (let i = 0; i < 12; i++) {
                  const val = dataArray[i * step] || 0;
                  // Map 0-255 to bar heights (min 4px, max 38px)
                  bars.push(Math.max(4, Math.round((val / 255) * 38)));
                }
                setAudioBars(bars);
              }
              animFrameRef.current = requestAnimationFrame(updateVisualizer);
            };

            animFrameRef.current = requestAnimationFrame(updateVisualizer);
          }
        } catch (audioErr) {
          console.warn('Audio visualizer setup skipped:', audioErr);
        }
      } catch (err: unknown) {
        console.warn('Camera/Microphone access error for call:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setMediaError(
          msg.includes('Permission') || msg.includes('denied')
            ? 'Camera / Microphone permission denied. Please allow device access in browser settings.'
            : 'Could not access audio/video devices on this system.'
        );
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
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
            localVideoRef.current.play().catch(() => {});
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
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 350);
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
      <div className="relative flex flex-col items-center justify-between w-full max-w-lg h-[600px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl shadow-2xl border border-slate-800 text-white overflow-hidden p-6 select-none">
        
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 z-20">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-[11px] font-semibold border border-emerald-500/30">
            <Shield className="h-3.5 w-3.5" />
            <span>End-to-End Encrypted {callType === 'video' ? 'Video' : 'Voice'} Call</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                callStatus === 'connected'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {callStatus === 'connected'
                ? formatTime(duration)
                : callStatus === 'ringing'
                ? 'Ringing...'
                : 'Call Ended'}
            </span>
          </div>
        </div>

        {/* Media Access Warning */}
        {mediaError && (
          <div className="w-full z-20 my-2 flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 p-3 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="flex-1">{mediaError}</span>
          </div>
        )}

        {/* Main View Area: Video Layout vs Voice Call Layout */}
        {callType === 'video' ? (
          <div className="relative flex-1 w-full my-3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            {/* Simulated Remote Stream View */}
            <div className="relative flex flex-col items-center justify-center text-center p-6 space-y-3 z-0">
              <div className="relative flex items-center justify-center">
                {callStatus === 'ringing' && (
                  <div className="absolute h-36 w-36 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
                )}
                <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white font-black text-4xl flex items-center justify-center shadow-xl border-2 border-emerald-400/40">
                  {initial}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{displayName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {callStatus === 'connected'
                    ? 'Connected • High Definition Stream'
                    : 'Calling contact...'}
                </p>
              </div>

              {/* Dynamic Audio Visualizer for the peer */}
              {callStatus === 'connected' && (
                <div className="flex items-center gap-1 h-8 mt-2">
                  {audioBars.map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full transition-all duration-75"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Local Picture-in-Picture (PiP) Video View (Top-Right) */}
            <div className="absolute top-3 right-3 z-10 w-28 sm:w-36 h-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-2xl bg-black flex items-center justify-center">
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2 text-slate-500">
                  <VideoOff className="h-6 w-6 mb-1 text-slate-400" />
                  <span className="text-[10px]">Camera Paused</span>
                </div>
              )}
              <div className="absolute bottom-1 left-2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-white drop-shadow">YOU</span>
              </div>
            </div>
          </div>
        ) : (
          /* Voice Call Layout */
          <div className="flex flex-col items-center text-center my-auto z-10 space-y-4">
            <div className="relative flex items-center justify-center">
              {callStatus === 'ringing' && (
                <div className="absolute h-40 w-40 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
              )}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white font-extrabold text-4xl shadow-2xl shadow-emerald-950/60 border-2 border-emerald-400/50">
                {initial}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{displayName}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {callStatus === 'ringing'
                  ? 'Securing end-to-end encrypted line...'
                  : callStatus === 'connected'
                  ? 'Connected • HD Audio Channel'
                  : 'Call Disconnected'}
              </p>
            </div>

            {/* Live Microphone Frequency Waves */}
            {callStatus === 'connected' && (
              <div className="flex items-center gap-1.5 h-12 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                {audioBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 rounded-full transition-all duration-75"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-around z-20 pt-4 border-t border-slate-800/90 bg-slate-950/60">
          {/* Mute button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
              isMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-900/40'
                : 'bg-slate-800 text-white hover:bg-slate-700'
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
                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-900/40'
                : 'bg-slate-800 text-white hover:bg-slate-700'
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
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle Speaker"
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
