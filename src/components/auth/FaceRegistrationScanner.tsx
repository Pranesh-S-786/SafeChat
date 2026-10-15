import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Upload,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  checkFrameLighting,
  extractFaceDescriptorFromImageFile,
  extractLandmarkDescriptor,
  initFaceLandmarker,
} from '../../lib/faceVerification';

interface FaceRegistrationScannerProps {
  onPatternCaptured: (descriptor: number[], previewUrl: string) => void;
  onResetPattern?: () => void;
  capturedPattern: number[] | null;
  capturedPreviewUrl: string | null;
}

export const FaceRegistrationScanner: React.FC<FaceRegistrationScannerProps> = ({
  onPatternCaptured,
  onResetPattern,
  capturedPattern,
  capturedPreviewUrl,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Click "Start Face Scan" to activate your camera and establish your security pattern.'
  );
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [lightingWarning, setLightingWarning] = useState<string | null>(null);
  const [multiFaceWarning, setMultiFaceWarning] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    setIsInitializing(true);
    setStatusMessage('Initializing Face Detection AI model...');

    try {
      // 1. Initialize MediaPipe FaceLandmarker
      const landmarker = await initFaceLandmarker();
      if (!landmarker) {
        throw new Error('Face landmark model could not be initialized in this browser.');
      }

      // 2. Request camera stream
      setStatusMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
      setIsInitializing(false);
      setStatusMessage('Face camera active. Center your face in the oval guide.');

      // 3. Start face detection loop
      startScanningLoop();
    } catch (err: unknown) {
      console.error('Camera or model start error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to access camera.';
      setCameraError(msg);
      setIsInitializing(false);
      setStatusMessage('Camera access unavailable. You can upload a photo instead.');
      stopCamera();
    }
  };

  const startScanningLoop = async () => {
    const landmarker = await initFaceLandmarker();
    if (!landmarker) return;

    let stableFrames = 0;
    const REQUIRED_STABLE_FRAMES = 12; // ~0.4 second of stable centered landmark capture
    let lastVideoTime = -1;

    const loop = () => {
      if (!streamRef.current) return;

      const video = videoRef.current;
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }

      if (!video) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.play().catch(() => {});
      }

      const ctx = canvas.getContext('2d');

      if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = 320;
        canvas.height = 320;
        ctx.drawImage(video, 0, 0, 320, 320);

        // Lighting check
        const lighting = checkFrameLighting(ctx, 320, 320);
        if (!lighting.isAdequate) {
          setLightingWarning(lighting.warning || 'Poor lighting detected');
        } else {
          setLightingWarning(null);
        }

        // Run MediaPipe Landmark detection
        let detectionResult: { faceLandmarks?: any[] } | null = null;
        try {
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            detectionResult = landmarker.detectForVideo(video, performance.now());
          }
        } catch {
          detectionResult = null;
        }

        if (detectionResult) {
          const faces = detectionResult.faceLandmarks || [];

          // Multi-face check
          if (faces.length > 1) {
            setMultiFaceWarning('Multiple faces detected. Ensure only you are visible.');
            setStatusMessage('Security check: Only 1 person permitted in frame.');
            stableFrames = 0;
            setScanProgress(0);
            animationFrameRef.current = requestAnimationFrame(loop);
            return;
          }
          setMultiFaceWarning(null);

          if (faces.length === 0) {
            setStatusMessage('Position your face inside the scanning guide.');
            stableFrames = Math.max(0, stableFrames - 1);
            setScanProgress(Math.round((stableFrames / REQUIRED_STABLE_FRAMES) * 100));
            animationFrameRef.current = requestAnimationFrame(loop);
            return;
          }

          const landmarks = faces[0];

          try {
            const { descriptor, eyeDistance } = extractLandmarkDescriptor(landmarks);

            if (eyeDistance < 0.05) {
              setStatusMessage('Please move slightly closer to the camera.');
              stableFrames = Math.max(0, stableFrames - 1);
              setScanProgress(Math.round((stableFrames / REQUIRED_STABLE_FRAMES) * 100));
              animationFrameRef.current = requestAnimationFrame(loop);
              return;
            }

            stableFrames++;
            const progress = Math.min(100, Math.round((stableFrames / REQUIRED_STABLE_FRAMES) * 100));
            setScanProgress(progress);
            setStatusMessage(`Extracting 64-D facial landmark pattern (${progress}%)... Hold steady.`);

            if (stableFrames >= REQUIRED_STABLE_FRAMES) {
              // Snapshot thumbnail
              const previewUrl = canvas.toDataURL('image/jpeg', 0.8);
              stopCamera();
              onPatternCaptured(descriptor, previewUrl);
              setStatusMessage('✓ Facial biometric pattern captured and stored locally!');
              return;
            }
          } catch {
            setStatusMessage('Analyzing facial geometry... Keep face centered.');
            stableFrames = Math.max(0, stableFrames - 1);
            setScanProgress(Math.round((stableFrames / REQUIRED_STABLE_FRAMES) * 100));
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setCameraError(null);
    setStatusMessage('Analyzing photo for 64-D facial landmark pattern...');

    try {
      const { descriptor, previewUrl } = await extractFaceDescriptorFromImageFile(file);
      onPatternCaptured(descriptor, previewUrl);
      setStatusMessage('✓ Facial pattern successfully extracted from photo and stored!');
    } catch (err) {
      console.error('Photo descriptor error:', err);
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Could not detect clear face landmarks in the selected photo.'
      );
      setStatusMessage('Photo analysis failed. Try another picture or use the live camera.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReset = () => {
    stopCamera();
    setScanProgress(0);
    setLightingWarning(null);
    setMultiFaceWarning(null);
    setCameraError(null);
    setStatusMessage('Click "Start Face Scan" to capture your face pattern.');
    if (onResetPattern) {
      onResetPattern();
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Step 1: Face Biometric Pattern</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                Required
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Scanned pattern is stored locally to compare during keystroke anomaly tests.
            </p>
          </div>
        </div>

        {capturedPattern && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Re-scan</span>
          </button>
        )}
      </div>

      {/* Hidden File Input for photo upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* State A: Pattern Already Captured */}
      {capturedPattern && capturedPreviewUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
          <div className="relative">
            <img
              src={capturedPreviewUrl}
              alt="Enrolled Face Baseline"
              className="h-16 w-16 rounded-xl object-cover border border-emerald-500/40 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <span>Face Pattern Stored Successfully</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              64-D Geometric landmark baseline stored. Ready to compare against typing cadence tests.
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] text-emerald-400 font-mono">
                ✓ 64 Landmark Vectors Extracted
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* State B: Scanner View / Capture Mode */
        <div className="space-y-3">
          {/* Camera Viewfinder */}
          {cameraActive ? (
            <div className="relative mx-auto h-52 w-52 overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-black shadow-lg">
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
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning reticle / guide overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`h-40 w-32 rounded-[50%] border-2 transition-colors duration-200 ${
                    scanProgress > 50
                      ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                      : 'border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  }`}
                />
                {/* Horizontal scanner beam line */}
                <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
              </div>

              {/* Progress counter badge */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-xs border border-emerald-500/30">
                {scanProgress}% Captured
              </div>
            </div>
          ) : (
            /* Standby Card */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                <Camera className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-semibold text-slate-200">
                Live Facial Landmark Scan
              </h4>
              <p className="mt-1 max-w-xs text-[11px] text-slate-400">
                Position your face to capture a 64-D geometric biometric pattern. Zero photos sent over network.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isInitializing}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950 hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Initializing...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5" />
                      <span>Start Face Scan</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {isProcessingPhoto ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar during active scan */}
          {cameraActive && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel camera & upload photo instead
                </button>
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="text-center text-[11px] text-slate-300">
            {statusMessage}
          </div>

          {/* Lighting or Multi-Face Alerts */}
          {lightingWarning && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{lightingWarning}</span>
            </div>
          )}

          {multiFaceWarning && (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-[11px] text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{multiFaceWarning}</span>
            </div>
          )}

          {cameraError && (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      )}

      {/* Hidden Canvas used for video frame landmark extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
