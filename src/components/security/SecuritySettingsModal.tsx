import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Shield,
  Key,
  Fingerprint,
  Camera,
  Cpu,
  Database,
  AlertTriangle,
  CheckCircle2,
  ScanFace,
  Upload,
  Video,
  VideoOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteFaceProfile,
  getEnrolledFaceProfile,
  computeBiometricSimilarity,
  extractLandmarkDescriptor,
  initFaceLandmarker,
  extractFaceDescriptorFromImageFile,
  getBiometricMatchPercentage,
  BIOMETRIC_MATCH_THRESHOLD,
} from '../../lib/faceVerification';
import { KeystrokeCollector } from '../../lib/keystroke';
import { evaluateMessageWithAIJury } from '../../lib/aiJury';
import type { AIJuryResult } from '../../lib/types';
import { getSupabaseCredentials, saveSupabaseCredentials } from '../../lib/supabase';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFaceEnroll: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenFaceEnroll,
}) => {
  const { user, keyPair } = useAuth();
  const [activeTab, setActiveTab] = useState<'e2ee' | 'keystroke' | 'face' | 'aijury' | 'supabase'>('e2ee');

  // Keystroke state
  const collector = user ? new KeystrokeCollector(user.id) : null;
  const [isKeystrokeOptedIn, setIsKeystrokeOptedIn] = useState<boolean>(collector?.isOptedIn() || false);
  const [testTypingInput, setTestTypingInput] = useState('');
  const [testKeystrokeResult, setTestKeystrokeResult] = useState<string | null>(null);

  // Keystroke & Face Comparison state
  const [isFaceComparing, setIsFaceComparing] = useState(false);
  const [faceComparisonScore, setFaceComparisonScore] = useState<number | null>(null);
  const [faceComparisonVerdict, setFaceComparisonVerdict] = useState<'verified' | 'failed' | 'scanning' | null>(null);
  const [faceComparisonMsg, setFaceComparisonMsg] = useState<string | null>(null);
  const [isSimulatedAnomaly, setIsSimulatedAnomaly] = useState(false);

  const testVideoRef = useRef<HTMLVideoElement>(null);
  const testCanvasRef = useRef<HTMLCanvasElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testAnimFrameRef = useRef<number | null>(null);
  const testPhotoInputRef = useRef<HTMLInputElement>(null);

  // AI Jury Sandbox state
  const [testMessage, setTestMessage] = useState('URGENT: Your account was suspended. Send your 6-digit code to verify identity.');
  const [sandboxResult, setSandboxResult] = useState<AIJuryResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Supabase state
  const creds = getSupabaseCredentials();
  const [sbUrl, setSbUrl] = useState(creds.url);
  const [sbKey, setSbKey] = useState(creds.anonKey);
  const [sbSaved, setSbSaved] = useState(false);

  const enrolledFace = user ? getEnrolledFaceProfile(user.id) : null;

  const stopFaceComparisonCamera = useCallback(() => {
    if (testAnimFrameRef.current) {
      cancelAnimationFrame(testAnimFrameRef.current);
      testAnimFrameRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    setIsFaceComparing(false);
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== 'keystroke') {
      stopFaceComparisonCamera();
    }
  }, [isOpen, activeTab, stopFaceComparisonCamera]);

  if (!isOpen) return null;

  const handleToggleKeystroke = (optIn: boolean) => {
    if (!collector) return;
    collector.setOptIn(optIn);
    setIsKeystrokeOptedIn(optIn);
  };

  const handleResetKeystroke = () => {
    if (!collector) return;
    collector.resetProfile();
    setTestKeystrokeResult('Keystroke profile reset. Recalibration started.');
    setIsSimulatedAnomaly(false);
  };

  const handleStartFaceComparison = async () => {
    if (!enrolledFace?.templateVector) {
      setFaceComparisonMsg('No face pattern enrolled. Please scan your face to establish a stored pattern first.');
      return;
    }

    setIsFaceComparing(true);
    setFaceComparisonVerdict('scanning');
    setFaceComparisonScore(null);
    setFaceComparisonMsg('Initializing camera and face landmark AI model...');

    try {
      const landmarker = await initFaceLandmarker();
      if (!landmarker) {
        throw new Error('Face landmark model could not be initialized.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' },
        audio: false,
      });

      testStreamRef.current = stream;
      setFaceComparisonMsg('Camera active. Center your face to compare against stored pattern...');

      const loop = () => {
        if (!testStreamRef.current) return;
        const video = testVideoRef.current;
        let canvas = testCanvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          testCanvasRef.current = canvas;
        }

        if (!video) {
          testAnimFrameRef.current = requestAnimationFrame(loop);
          return;
        }

        if (video.srcObject !== testStreamRef.current) {
          video.srcObject = testStreamRef.current;
          video.play().catch(() => {});
        }

        const ctx = canvas.getContext('2d');

        if (ctx && video.readyState >= 2) {
          canvas.width = 320;
          canvas.height = 320;
          ctx.drawImage(video, 0, 0, 320, 320);

          let res;
          try {
            res = landmarker.detectForVideo(video, performance.now());
          } catch {
            res = null;
          }

          const faces = res?.faceLandmarks || [];
          if (faces.length > 1) {
            setFaceComparisonMsg('Multiple faces detected. Ensure only you are visible.');
          } else if (faces.length === 0) {
            setFaceComparisonMsg('Looking for face... Align with camera.');
          } else {
            try {
              const { descriptor } = extractLandmarkDescriptor(faces[0]);
              const similarity = computeBiometricSimilarity(enrolledFace.templateVector, descriptor);
              const matchPct = getBiometricMatchPercentage(similarity);
              setFaceComparisonScore(matchPct / 100);

              if (similarity >= BIOMETRIC_MATCH_THRESHOLD) {
                setFaceComparisonVerdict('verified');
                setFaceComparisonMsg(`✓ Identity Confirmed (${matchPct}% match). Live face matches pattern stored at account creation!`);
              } else {
                setFaceComparisonVerdict('failed');
                setFaceComparisonMsg(`❌ Identity Mismatch (${matchPct}% match). Live face does not match stored pattern.`);
              }
            } catch {
              setFaceComparisonMsg('Analyzing facial landmarks... Keep centered.');
            }
          }
        }
        testAnimFrameRef.current = requestAnimationFrame(loop);
      };

      testAnimFrameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error('Face comparison camera error:', err);
      const msg = err instanceof Error ? err.message : 'Camera failed to activate.';
      setFaceComparisonMsg(msg);
      setFaceComparisonVerdict('failed');
      stopFaceComparisonCamera();
    }
  };

  const handlePhotoComparison = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !enrolledFace?.templateVector) return;

    setFaceComparisonMsg('Analyzing photo landmarks against stored pattern...');
    setFaceComparisonVerdict('scanning');

    try {
      const { descriptor } = await extractFaceDescriptorFromImageFile(file);
      const similarity = computeBiometricSimilarity(enrolledFace.templateVector, descriptor);
      const matchPct = getBiometricMatchPercentage(similarity);
      setFaceComparisonScore(matchPct / 100);

      if (similarity >= BIOMETRIC_MATCH_THRESHOLD) {
        setFaceComparisonVerdict('verified');
        setFaceComparisonMsg(`✓ Photo Verified (${matchPct}% match). Matches pattern stored at account creation!`);
      } else {
        setFaceComparisonVerdict('failed');
        setFaceComparisonMsg(`❌ Photo Mismatch (${matchPct}% match). Photo does not match stored pattern.`);
      }
    } catch (err) {
      setFaceComparisonMsg(err instanceof Error ? err.message : 'Photo processing failed.');
      setFaceComparisonVerdict('failed');
    } finally {
      if (testPhotoInputRef.current) {
        testPhotoInputRef.current.value = '';
      }
    }
  };

  const handleRunAIJurySandbox = async () => {
    if (!testMessage.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await evaluateMessageWithAIJury(testMessage.trim());
      setSandboxResult(res);
    } catch (err) {
      console.error('AI Jury sandbox error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(sbUrl, sbKey);
    setSbSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Security & Biometrics Control Center</h3>
              <p className="text-xs text-slate-400">Zero-Trust Cryptographic & Identity Verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-950/60 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('e2ee')}
            className={`flex-1 rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'e2ee' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>E2EE Keys</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keystroke')}
            className={`flex-1 rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'keystroke' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Keystroke Dynamics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('face')}
            className={`flex-1 rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'face' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Facial Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aijury')}
            className={`flex-1 rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'aijury' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>AI Jury</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 rounded-lg py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Supabase</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4 text-xs">
          {/* TAB 1: E2EE KEYS */}
          {activeTab === 'e2ee' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="font-semibold text-slate-200">Public Key SHA-256 Fingerprint</div>
                <div className="font-mono text-[11px] text-emerald-400 bg-slate-900 p-2.5 rounded-xl border border-slate-800 break-all select-all">
                  {keyPair ? keyPair.fingerprint : 'No cryptographic key initialized'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Compare this fingerprint with your contacts via out-of-band communication to verify channel authenticity.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="font-semibold text-slate-200">Zero Server Exposure Guarantee</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your RSA private key was generated on this device using Web Crypto API and is saved exclusively in IndexedDB (<code>SafeChat_KeyStore_v1</code>). Supabase and database administrators have zero access to your plaintext messages or private key.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: KEYSTROKE DYNAMICS */}
          {activeTab === 'keystroke' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <div className="font-semibold text-slate-200">Continuous Behavioral Typing Profiling</div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Extracts local dwell and flight times to detect unauthorized device takeover.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleKeystroke(!isKeystrokeOptedIn)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isKeystrokeOptedIn
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isKeystrokeOptedIn ? 'Enabled (Opted In)' : 'Disabled'}
                </button>
              </div>

              {/* Stored Face Pattern Info Banner */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ScanFace className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Registration Face Pattern
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {enrolledFace ? (
                        <span className="text-emerald-400 font-medium">
                          ✓ Enrolled ({enrolledFace.templateVector.length}-D Landmark Vector stored locally)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">
                          ⚠️ No face pattern stored. Scan face at account creation or enroll now.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!enrolledFace && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFaceEnroll();
                    }}
                    className="rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    Enroll Pattern Now
                  </button>
                )}
              </div>

              {/* Interactive typing tester & face comparison */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Keystroke Test Bench & Face Comparison</div>
                    <p className="text-[11px] text-slate-400">
                      Type to test rhythm anomaly detection, then verify against the face pattern stored at account creation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSimulatedAnomaly(true);
                      setTestKeystrokeResult('Status: ANOMALY | Anomaly Score: 0.88 | Z: 2.65 (Simulated rapid cadence deviation)');
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    Simulate Anomaly
                  </button>
                </div>

                <input
                  type="text"
                  value={testTypingInput}
                  onChange={(e) => {
                    setTestTypingInput(e.target.value);
                    if (collector) {
                      const rep = collector.analyzeAndEvaluate();
                      setTestKeystrokeResult(`Status: ${rep.status.toUpperCase()} | Anomaly Score: ${rep.anomalyScore} | Z: ${rep.dwellDeviationZ}`);
                      if (rep.isRiskAlert || rep.status === 'anomaly') {
                        setIsSimulatedAnomaly(true);
                      }
                    }
                  }}
                  onKeyDown={(e) => collector?.handleKeyDown(e)}
                  onKeyUp={(e) => collector?.handleKeyUp(e)}
                  placeholder="Type a sample sentence here to test your rhythm..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />

                {testKeystrokeResult && (
                  <div className="text-[11px] font-mono text-emerald-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>{testKeystrokeResult}</span>
                    <button
                      type="button"
                      onClick={handleResetKeystroke}
                      className="text-[10px] text-slate-400 hover:text-rose-400 underline transition-colors"
                    >
                      Reset Baseline
                    </button>
                  </div>
                )}

                {/* Anomaly Challenge Notification */}
                {isSimulatedAnomaly && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      <span>Keystroke Anomaly Detected! Identity Challenge Triggered</span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 leading-snug">
                      Typing dynamics deviated from normal baseline. Compare live face with the pattern stored at account creation to confirm identity.
                    </p>
                  </div>
                )}

                {/* Face Comparison Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={isFaceComparing ? stopFaceComparisonCamera : handleStartFaceComparison}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow transition-all active:scale-95 ${
                      isFaceComparing
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                    }`}
                  >
                    {isFaceComparing ? (
                      <>
                        <VideoOff className="h-3.5 w-3.5" />
                        <span>Stop Face Comparison</span>
                      </>
                    ) : (
                      <>
                        <Video className="h-3.5 w-3.5" />
                        <span>Compare Live Face with Stored Pattern</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => testPhotoInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Compare with Photo</span>
                  </button>

                  <input
                    ref={testPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoComparison}
                    className="hidden"
                  />
                </div>

                {/* Live Face Comparison Viewport */}
                {isFaceComparing && (
                  <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-black shadow-lg">
                      <video
                        ref={(el) => {
                          testVideoRef.current = el;
                          if (el && testStreamRef.current && el.srcObject !== testStreamRef.current) {
                            el.srcObject = testStreamRef.current;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover transform scale-x-[-1]"
                      />
                      <canvas ref={testCanvasRef} className="hidden" />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div
                          className={`h-36 w-28 rounded-[50%] border-2 transition-colors duration-200 ${
                            faceComparisonVerdict === 'verified'
                              ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                              : faceComparisonVerdict === 'failed'
                              ? 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                              : 'border-cyan-400/80 animate-pulse'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Face Comparison Score & Verdict Display */}
                {faceComparisonMsg && (
                  <div
                    className={`rounded-xl p-3 text-xs space-y-1.5 border ${
                      faceComparisonVerdict === 'verified'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : faceComparisonVerdict === 'failed'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        {faceComparisonVerdict === 'verified' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : faceComparisonVerdict === 'failed' ? (
                          <AlertTriangle className="h-4 w-4 text-rose-400" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                        )}
                        <span>Biometric Comparison Result</span>
                      </div>
                      {faceComparisonScore !== null && (
                        <span className="font-mono text-xs">
                          {Math.round(faceComparisonScore * 100)}% Similarity
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed">{faceComparisonMsg}</p>
                    {faceComparisonScore !== null && (
                      <div className="pt-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full transition-all duration-200 ${
                              faceComparisonScore >= 0.70 ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.round(faceComparisonScore * 100))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                          <span>0%</span>
                          <span>Threshold: 70%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FACIAL BIOMETRICS */}
          {activeTab === 'face' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Face Verification Profile</div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {enrolledFace ? 'Biometric descriptor enrolled locally.' : 'No face template enrolled yet.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {enrolledFace && (
                    <button
                      type="button"
                      onClick={() => {
                        if (user) deleteFaceProfile(user.id);
                        alert('Enrolled face profile removed.');
                      }}
                      className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-rose-400 hover:bg-slate-700"
                    >
                      Delete Profile
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFaceEnroll();
                    }}
                    className="rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white shadow"
                  >
                    {enrolledFace ? 'Re-Enroll Face' : 'Enroll Face Now'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-[11px] text-slate-400 leading-relaxed">
                <strong>Privacy Guarantee:</strong> Facial biometric data is converted into an anonymous mathematical descriptor vector stored solely in your local browser storage. Raw photos or videos are never sent over the network.
              </div>
            </div>
          )}

          {/* TAB 4: AI JURY SANDBOX */}
          {activeTab === 'aijury' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
                <div className="font-semibold text-slate-200">Live AI Jury Deliberation Sandbox</div>
                <p className="text-[11px] text-slate-400">
                  Test any message in real-time across Decision Tree, Naive Bayes, k-NN, and Neural Network jurors.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message to evaluate..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRunAIJurySandbox}
                    disabled={isEvaluating}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0"
                  >
                    Run Jury
                  </button>
                </div>
              </div>

              {sandboxResult && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Verdict:</span>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                        sandboxResult.verdict === 'SCAM'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : sandboxResult.verdict === 'UNCERTAIN'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {sandboxResult.verdict} ({Math.round(sandboxResult.confidence * 100)}% risk)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      Decision Tree: <strong>{sandboxResult.votes.decisionTree ? 'SCAM' : 'SAFE'}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      Naive Bayes: <strong>{sandboxResult.votes.naiveBayes ? 'SCAM' : 'SAFE'}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      k-NN: <strong>{sandboxResult.votes.knn ? 'SCAM' : 'SAFE'}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      ANN Neural Net: <strong>{sandboxResult.votes.ann ? 'SCAM' : 'SAFE'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SUPABASE */}
          {activeTab === 'supabase' && (
            <form onSubmit={handleSaveSupabase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project URL</label>
                <input
                  type="url"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Anon Key</label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  {sbSaved ? 'Saved! Reloading...' : 'Update Supabase Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
