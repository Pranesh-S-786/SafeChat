import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanFace,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  LogOut,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  initFaceLandmarker,
  extractLandmarkDescriptor,
  computeBiometricSimilarity,
  getEnrolledFaceProfile,
  getBiometricMatchPercentage,
  BIOMETRIC_MATCH_THRESHOLD,
} from '../../lib/faceVerification';
import { playUnlockSound } from '../../lib/notifications';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';

interface FaceLockScreenProps {
  userId: string;
  onUnlock: () => void;
}

export const FaceLockScreen: React.FC<FaceLockScreenProps> = ({ userId, onUnlock }) => {
  const { user, signOut } = useAuth();
  const [matchPercentage, setMatchPercentage] = useState<number | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState('Initializing camera...');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const enrolledFace = getEnrolledFaceProfile(userId);
  const isEnrolled = Boolean(enrolledFace?.enrolled && enrolledFace.templateVector);

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
    setStatusMessage('✓ Identity Verified! Unlocking SafeChat...');
    try {
      playUnlockSound();
    } catch {
      // ignore
    }
    stopCamera();
    setTimeout(() => {
      onUnlock();
    }, 350);
  }, [onUnlock, stopCamera]);

  useEffect(() => {
    let isMounted = true;

    async function startScanner() {
      stopCamera();
      setCameraError(null);
      setStatusMessage('Accessing local camera...');

      // 1. Immediately request the camera stream
      let stream: MediaStream | null = null;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setStatusMessage(
          isEnrolled
            ? 'Camera active. Positioning face for biometric match...'
            : 'No facial pattern enrolled yet. Please use password to unlock.'
        );
      } catch (camErr: unknown) {
        if (!isMounted) return;
        const msg = camErr instanceof Error ? camErr.message : String(camErr);
        console.warn('Camera access error in FaceLockScreen:', msg);
        setCameraError(
          msg.includes('Permission') || msg.includes('denied')
            ? 'Camera permission denied. Allow camera access or unlock with password.'
            : 'Camera could not be accessed. Please unlock with your account password.'
        );
        setShowPasswordFallback(true);
        return;
      }

      // If user has not enrolled face biometrics yet, default to password mode
      if (!isEnrolled) {
        setShowPasswordFallback(true);
        setStatusMessage('No face pattern enrolled yet. Please enter password to unlock.');
        return;
      }

      // 2. Load MediaPipe AI Face Landmarker model
      try {
        const landmarker = await initFaceLandmarker();
        if (!isMounted) return;

        if (!landmarker) {
          setStatusMessage('Biometric AI model unavailable. Please unlock with password.');
          setShowPasswordFallback(true);
          return;
        }

        setStatusMessage('Look directly at camera to verify face...');

        let consecutiveMatches = 0;

        const drawBiometricMesh = (
          ctx: CanvasRenderingContext2D,
          landmarks: any[],
          width: number,
          height: number,
          isMatch: boolean
        ) => {
          ctx.clearRect(0, 0, width, height);

          const POINTS = [
            33, 133, 159, 145, 263, 362, 386, 374, // eyes
            70, 63, 105, 300, 293, 334, // brows
            1, 2, 4, 168, 195, // nose
            61, 291, 0, 17, 13, 14, // lips
            10, 152, 234, 454, 172, 397 // contour
          ];

          ctx.fillStyle = isMatch ? '#10b981' : '#f43f5e';
          ctx.shadowColor = isMatch ? 'rgba(16, 185, 129, 0.9)' : 'rgba(244, 63, 94, 0.9)';
          ctx.shadowBlur = 5;

          for (const idx of POINTS) {
            const pt = landmarks[idx];
            if (!pt) continue;
            // Mirrored canvas coordinates
            const x = (1 - pt.x) * width;
            const y = pt.y * height;
            ctx.beginPath();
            ctx.arc(x, y, 2.4, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Connecting eye line
          ctx.shadowBlur = 0;
          ctx.strokeStyle = isMatch ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';
          ctx.lineWidth = 1.2;

          if (landmarks[33] && landmarks[263]) {
            ctx.beginPath();
            ctx.moveTo((1 - landmarks[33].x) * width, landmarks[33].y * height);
            ctx.lineTo((1 - landmarks[263].x) * width, landmarks[263].y * height);
            ctx.stroke();
          }
        };

        const processFrame = () => {
          if (!isMounted) return;

          const video = videoRef.current;
          if (video && streamRef.current && video.srcObject !== streamRef.current) {
            video.srcObject = streamRef.current;
            video.play().catch(() => {});
          }

          const overlayCanvas = overlayCanvasRef.current;
          const overlayCtx = overlayCanvas?.getContext('2d');

          if (video && video.readyState >= 2 && landmarker) {
            try {
              const results = landmarker.detectForVideo(video, performance.now());

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                setIsFaceDetected(true);
                const landmarks = results.faceLandmarks[0];
                const { descriptor: currentVector } = extractLandmarkDescriptor(landmarks);

                const rawScore = computeBiometricSimilarity(currentVector, enrolledFace!.templateVector);
                const percentage = getBiometricMatchPercentage(rawScore);
                setMatchPercentage(percentage);

                const isMatch = rawScore >= BIOMETRIC_MATCH_THRESHOLD;

                if (overlayCtx) {
                  drawBiometricMesh(overlayCtx, landmarks, 224, 224, isMatch);
                }

                if (isMatch) {
                  consecutiveMatches += 1;
                  setStatusMessage(`✓ Face Verified (${percentage}% match) — Confirming...`);
                  if (consecutiveMatches >= 2) {
                    handleSuccessfulUnlock();
                    return;
                  }
                } else {
                  consecutiveMatches = 0;
                  if (percentage <= 45) {
                    setStatusMessage(`⚠️ Unauthorized Face (${percentage}% match) — Access Denied`);
                  } else {
                    setStatusMessage(`Scanning Face (${percentage}% match)... Align closer and hold steady`);
                  }
                }
              } else {
                setIsFaceDetected(false);
                consecutiveMatches = 0;
                setMatchPercentage(null);
                if (overlayCtx) {
                  overlayCtx.clearRect(0, 0, 224, 224);
                }
                setStatusMessage('No face detected in camera. Center face in scanner...');
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
        setStatusMessage('AI engine unavailable. Please unlock with your account password.');
        setShowPasswordFallback(true);
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [enrolledFace, handleSuccessfulUnlock, isEnrolled, stopCamera, retryCount]);

  // Account password unlock fallback (verifies against real account password)
  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackInput.trim()) {
      setFallbackError('Please enter your account password');
      return;
    }

    setFallbackError(null);
    setIsVerifyingPassword(true);

    try {
      const supabase = getSupabaseClient();
      if (supabase && user?.email) {
        const { error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: fallbackInput,
        });

        if (error) {
          setFallbackError('Incorrect password. Please try again.');
          setIsVerifyingPassword(false);
          return;
        }
      }

      handleSuccessfulUnlock();
    } catch {
      setFallbackError('Password verification failed. Please try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
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
          <p className="text-xs text-slate-400">Continuous Biometric Verification</p>
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
                  className="h-full w-full object-cover transform scale-x-[-1]"
                />

                {/* Real-time Facial Landmark Overlay Canvas */}
                <canvas
                  ref={overlayCanvasRef}
                  width={224}
                  height={224}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover z-10"
                />

                {!isUnlocked && isFaceDetected && (
                  <div
                    className={`absolute inset-0 border-2 rounded-full pointer-events-none transition-colors duration-200 ${
                      matchPercentage !== null && matchPercentage >= 80
                        ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse'
                        : 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                    }`}
                  />
                )}

                {!isUnlocked && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-500/50 animate-bounce pointer-events-none" />
                )}

                {isUnlocked && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex items-center justify-center animate-in zoom-in duration-300 z-20">
                    <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Biometric Status Indicator */}
          {matchPercentage !== null && !isUnlocked && (
            <div
              className={`mt-3 flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-mono font-semibold border ${
                matchPercentage >= 80
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              <ScanFace className="h-3.5 w-3.5" />
              <span>
                {matchPercentage >= 80
                  ? `Owner Match: ${matchPercentage}%`
                  : `Mismatch: ${matchPercentage}% (Unauthorized)`}
              </span>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-300 text-center font-medium max-w-xs px-2">
            {statusMessage}
          </p>
        </div>

        {/* Password Fallback View */}
        {showPasswordFallback ? (
          <form onSubmit={handlePasswordUnlock} className="w-full space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Account Password
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
                disabled={isVerifyingPassword}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-60"
              >
                {isVerifyingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Unlock</span>
                )}
              </button>
              {isEnrolled && (
                <button
                  type="button"
                  onClick={() => setShowPasswordFallback(false)}
                  className="rounded-xl bg-slate-800 py-2.5 px-3 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Use Face
                </button>
              )}
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
