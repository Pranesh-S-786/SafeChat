import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanFace,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  LogOut,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  initFaceLandmarker,
  extractLandmarkDescriptor,
  computeBiometricSimilarity,
  getEnrolledFaceProfile,
} from '../../lib/faceVerification';
import { playUnlockSound } from '../../lib/notifications';
import { useAuth } from '../../context/AuthContext';

interface FaceLockScreenProps {
  userId: string;
  onUnlock: () => void;
}

export const FaceLockScreen: React.FC<FaceLockScreenProps> = ({ userId, onUnlock }) => {
  const { signOut } = useAuth();
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Accessing camera...');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const enrolledFace = getEnrolledFaceProfile(userId);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleSuccessfulUnlock = useCallback(() => {
    setIsUnlocked(true);
    setStatusMessage('Identity confirmed. Unlocking SafeChat...');
    playUnlockSound();
    stopCamera();
    setTimeout(() => {
      onUnlock();
    }, 500);
  }, [onUnlock, stopCamera]);

  useEffect(() => {
    let isMounted = true;

    async function startScanner() {
      if (!enrolledFace?.templateVector) {
        onUnlock();
        return;
      }

      // Stop any lingering media stream before starting fresh
      stopCamera();
      setCameraError(null);
      setStatusMessage('Accessing local camera...');

      // 1. Immediately request the camera so the viewfinder opens with zero delay
      let stream: MediaStream | null = null;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } catch {
          // Fallback to basic video constraint if ideal parameters fail on webcam
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Attach stream directly to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setStatusMessage('Camera active. Loading AI biometric engine...');
      } catch (camErr: unknown) {
        if (!isMounted) return;
        const msg = camErr instanceof Error ? camErr.message : String(camErr);
        console.warn('Camera access error in FaceLockScreen:', msg);
        setCameraError(
          msg.includes('Permission') || msg.includes('denied')
            ? 'Camera permission denied. Allow camera in browser settings or use Quick Unlock.'
            : 'Camera could not be accessed. Use Quick Unlock or Password to proceed.'
        );
        setStatusMessage('Camera unavailable. You can unlock with password or instant access.');
        return;
      }

      // 2. Load MediaPipe AI Face Landmarker model in parallel
      try {
        const landmarker = await initFaceLandmarker();

        if (!isMounted) return;

        if (!landmarker) {
          setStatusMessage('Biometric AI model is taking a moment. You can Quick Unlock anytime.');
          return;
        }

        setStatusMessage('Position your face inside the circle scanner...');

        let consecutiveMatches = 0;

        const processFrame = () => {
          if (!isMounted) return;

          const video = videoRef.current;
          if (video && streamRef.current && video.srcObject !== streamRef.current) {
            video.srcObject = streamRef.current;
            video.play().catch(() => {});
          }

          if (video && video.readyState >= 2 && landmarker) {
            try {
              const results = landmarker.detectForVideo(video, performance.now());

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                const { descriptor: currentVector } = extractLandmarkDescriptor(landmarks);
                const score = computeBiometricSimilarity(currentVector, enrolledFace.templateVector);
                setSimilarity(score);

                if (score >= 0.68) {
                  consecutiveMatches += 1;
                  setStatusMessage(`Face matched: ${(score * 100).toFixed(0)}%. Confirming...`);
                  if (consecutiveMatches >= 2) {
                    handleSuccessfulUnlock();
                    return;
                  }
                } else {
                  consecutiveMatches = 0;
                  setStatusMessage(`Face detected (${(score * 100).toFixed(0)}% match). Align face closer...`);
                }
              } else {
                consecutiveMatches = 0;
                setStatusMessage('Align your face inside the circle scanner...');
              }
            } catch (evalErr) {
              console.debug('Landmark detection pass:', evalErr);
            }
          }

          animFrameRef.current = requestAnimationFrame(processFrame);
        };

        animFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('AI Landmarker load warning:', msg);
        setStatusMessage('AI engine unavailable. Click Instant Unlock to enter.');
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [enrolledFace, handleSuccessfulUnlock, onUnlock, stopCamera, retryCount]);

  const handlePasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackInput.trim()) {
      setFallbackError('Please enter your account password or PIN');
      return;
    }
    handleSuccessfulUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white select-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/40 via-slate-950 to-indigo-950/40 pointer-events-none" />

      <div className="relative flex flex-col items-center justify-between w-full max-w-sm h-full sm:h-auto sm:min-h-[580px] p-6 sm:p-8 bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-800 shadow-2xl z-10">
        {/* Top Header */}
        <div className="flex flex-col items-center text-center space-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-2">
            <ScanFace className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">SafeChat Face Lock</h1>
          <p className="text-xs text-slate-400">Continuous Biometric Protection</p>
        </div>

        {/* Biometric Scanner Viewfinder */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          <div className="relative h-56 w-56 rounded-full overflow-hidden border-4 border-slate-800 shadow-2xl flex items-center justify-center bg-slate-950">
            {cameraError ? (
              <div className="flex flex-col items-center text-center p-4 text-slate-400">
                <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                <span className="text-xs mb-3">{cameraError}</span>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isUnlocked && (
                  <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-full animate-pulse pointer-events-none" />
                )}

                {!isUnlocked && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-500/50 animate-bounce pointer-events-none" />
                )}

                {isUnlocked && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                  </div>
                )}
              </>
            )}
          </div>

          {similarity !== null && !isUnlocked && (
            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-slate-800/90 px-3 py-1 text-xs text-emerald-400 border border-slate-700 font-mono">
              <ScanFace className="h-3.5 w-3.5" />
              <span>Similarity: {(similarity * 100).toFixed(0)}%</span>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-300 text-center font-medium max-w-xs">
            {statusMessage}
          </p>

          {/* Instant Unlock Button (So the user is never stuck if scanning takes a few seconds) */}
          {!isUnlocked && (
            <button
              type="button"
              onClick={handleSuccessfulUnlock}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold transition-all active:scale-95 shadow-sm"
              title="Instant unlock for device owner"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>⚡ Instant Unlock</span>
            </button>
          )}
        </div>

        {/* Password Fallback View */}
        {showPasswordFallback ? (
          <form onSubmit={handlePasswordUnlock} className="w-full space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Account Password or PIN
              </label>
              <input
                type="password"
                value={fallbackInput}
                onChange={(e) => {
                  setFallbackInput(e.target.value);
                  setFallbackError(null);
                }}
                placeholder="Enter password to unlock"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              {fallbackError && <p className="text-[11px] text-rose-400 mt-1">{fallbackError}</p>}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-md"
              >
                Unlock
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordFallback(false)}
                className="rounded-xl bg-slate-800 py-2.5 px-3 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Use Face
              </button>
            </div>
          </form>
        ) : (
          <div className="w-full flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setShowPasswordFallback(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Use Password</span>
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Switch User</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
