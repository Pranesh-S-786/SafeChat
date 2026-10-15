import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Cpu,
  Fingerprint,
  Camera,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface WatchVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export const WatchVideoModal: React.FC<WatchVideoModalProps> = ({
  isOpen,
  onClose,
  onGetStarted,
}) => {
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  const chapters = [
    {
      title: '1. Client-Side End-to-End Encryption',
      icon: Shield,
      tag: 'Zero Server Exposure',
      subtitle: 'RSA-OAEP 2048 & AES-GCM 256 Web Crypto',
      description:
        'Keys are generated directly inside your browser memory and persisted securely in IndexedDB. Ciphertext is transmitted over Supabase websockets — even database administrators cannot read your messages.',
      visualDetail: 'IndexedDB KeyStore (SafeChat_KeyStore_v1) ➔ SHA-256 Fingerprint Check',
      accentColor: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: '2. In-Browser AI Scam Jury Ensemble',
      icon: Cpu,
      tag: '100% Client Inference',
      subtitle: 'Decision Tree, Naive Bayes, k-NN & ANN',
      description:
        'Every incoming message runs through a 4-model machine learning voting ensemble trained on 5,594 benchmark SMS and phishing threats. Zero message text ever leaves your browser to external AI APIs.',
      visualDetail: '98.30% Accuracy • 97.83% Precision • Sublinear TF-IDF Vectorizer',
      accentColor: 'from-indigo-600 to-purple-600',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      title: '3. Continuous Keystroke Dynamics',
      icon: Fingerprint,
      tag: 'Behavioral Biometrics',
      subtitle: 'Dwell & Flight Latency Profiling',
      description:
        'Extracts millimeter-level keydown dwell times and flight latency between keys while you type. If an unauthorized user takes over your unlocked phone or computer, SafeChat flags the anomaly and prompts verification.',
      visualDetail: 'Z-Score Normalization (> 1.7σ deviation alert) • Zero Raw Key Logging',
      accentColor: 'from-purple-600 to-pink-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: '4. Consent-Based Facial Biometrics',
      icon: Camera,
      tag: 'MediaPipe 478 Landmarks',
      subtitle: 'Active Interactive Liveness Challenge',
      description:
        'When an identity alert occurs, a cryptographic verification challenge runs locally using Google MediaPipe. Users must pass randomized gestures (blink, head turns) to cryptographically attest session continuity.',
      visualDetail: 'Scale/Rotation-Invariant 64-D Geometric Vector • SHA-256 Session Token Binding',
      accentColor: 'from-cyan-500 to-blue-600',
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
  ];

  // Auto-advance progress when playing
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveChapter((ch) => (ch + 1) % chapters.length);
          return 0;
        }
        return prev + 1.25;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, chapters.length]);

  if (!isOpen) return null;

  const current = chapters[activeChapter];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Video Player Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Shield className="h-4 w-4 fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>SafeChat Product Tour & Architecture</span>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                  Interactive Demo
                </span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video Stage / Animated Canvas */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 sm:p-10 text-white flex flex-col justify-between min-h-[300px]">
          {/* Ambient glow in background */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

          {/* Top Stage Tag */}
          <div className="flex items-center justify-between relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm border border-white/20">
              <Sparkles className="h-3 w-3 text-indigo-300" />
              <span>{current.tag}</span>
            </span>

            <span className="text-xs font-mono text-slate-400">
              Chapter {activeChapter + 1} of {chapters.length}
            </span>
          </div>

          {/* Center Graphic & Headline */}
          <div className="my-auto py-6 relative z-10 space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl border border-white/20 transition-all duration-300">
              <Icon className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {current.title}
            </h2>
            <p className="text-sm font-medium text-indigo-200">
              {current.subtitle}
            </p>
            <p className="max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              {current.description}
            </p>
            <div className="inline-block rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 text-[11px] font-mono text-emerald-300">
              {current.visualDetail}
            </div>
          </div>

          {/* Timeline Progress Bar */}
          <div className="relative z-10 pt-4">
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Video Player Bottom Controls & Chapter Selector */}
        <div className="p-4 sm:p-5 bg-white space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgress(0);
                  setIsPlaying(true);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                title="Restart Chapter"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700">
                {isPlaying ? 'Playing Architecture Walkthrough...' : 'Paused'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onGetStarted();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span>Try SafeChat Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Chapter Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
            {chapters.map((ch, idx) => {
              const isSelected = idx === activeChapter;
              const ChIcon = ch.icon;
              return (
                <button
                  key={ch.title}
                  type="button"
                  onClick={() => {
                    setActiveChapter(idx);
                    setProgress(0);
                    setIsPlaying(true);
                  }}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold shadow-xs'
                      : 'hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  <ChIcon
                    className={`h-4 w-4 shrink-0 ${
                      isSelected ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[11px]">{ch.title.split('. ')[1]}</div>
                    <div className="text-[10px] text-slate-400 truncate">{ch.tag}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
