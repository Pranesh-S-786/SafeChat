import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  Play,
  CheckCircle2,
  Lock,
  Cpu,
  Fingerprint,
  Camera,
} from 'lucide-react';
import { InteractivePhones } from './InteractivePhones';
import { WatchVideoModal } from './WatchVideoModal';
import { AIJuryModal } from '../security/AIJuryModal';
import { FaceVerificationModal } from '../security/FaceVerificationModal';
import { SecuritySettingsModal } from '../security/SecuritySettingsModal';
import { evaluateMessageWithAIJury } from '../../lib/aiJury';
import type { AIJuryResult } from '../../lib/types';

interface LandingPageProps {
  onGetStarted: () => void;
  isSignedIn?: boolean;
  onEnterApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  isSignedIn = false,
  onEnterApp,
}) => {
  const [activeNav, setActiveNav] = useState<'home' | 'features' | 'technology' | 'about'>('home');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  // Modals triggered from landing page interactions
  const [juryModalMessage, setJuryModalMessage] = useState<string | null>(null);
  const [juryResult, setJuryResult] = useState<AIJuryResult | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  // Live Sandbox state
  const [sandboxInput, setSandboxInput] = useState<string>(
    'URGENT: Click here to verify your account or transfer funds immediately: https://scam-verify-wallet.xyz'
  );
  const [sandboxResult, setSandboxResult] = useState<AIJuryResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const handleOpenJury = async (text: string) => {
    setJuryModalMessage(text);
    const result = await evaluateMessageWithAIJury(text);
    setJuryResult(result);
  };

  const handleRunSandbox = async () => {
    if (!sandboxInput.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await evaluateMessageWithAIJury(sandboxInput.trim());
      setSandboxResult(res);
    } finally {
      setIsEvaluating(false);
    }
  };

  const scrollToSection = (id: string, nav: 'home' | 'features' | 'technology' | 'about') => {
    setActiveNav(nav);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FAFBFD] font-sans text-slate-900 selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      {/* ============================================================ */}
      {/* 1. TOP NAVBAR                                                */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-18">
          {/* Left: Brand Logo */}
          <div
            onClick={() => scrollToSection('hero', 'home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5 fill-white" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                SAFE<span className="text-indigo-600">CHAT</span>
              </span>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('hero', 'home')}
              className={`relative py-1 transition-colors ${
                activeNav === 'home' ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Home</span>
              {activeNav === 'home' && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-indigo-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('features', 'features')}
              className={`relative py-1 transition-colors ${
                activeNav === 'features' ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Features</span>
              {activeNav === 'features' && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-indigo-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('technology', 'technology')}
              className={`relative py-1 transition-colors ${
                activeNav === 'technology' ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Technology</span>
              {activeNav === 'technology' && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-indigo-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('about', 'about')}
              className={`relative py-1 transition-colors ${
                activeNav === 'about' ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>About</span>
              {activeNav === 'about' && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-indigo-600" />
              )}
            </button>
          </nav>

          {/* Right: CTA Button */}
          <div className="flex items-center gap-3">
            {isSignedIn && onEnterApp ? (
              <button
                type="button"
                onClick={onEnterApp}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Enter Messenger</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION (Exactly Matching User Model)                */}
      {/* ============================================================ */}
      <section id="hero" className="relative pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Headline, Subheadline & Action Buttons */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-6 text-left">
              {/* Badge: PRIVATE • SECURE • INTELLIGENT */}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 shadow-xs backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                  PRIVATE • SECURE • INTELLIGENT
                </span>
              </div>

              {/* Main Headline */}
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.08]">
                  Conversations
                </h1>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-500 bg-clip-text text-transparent italic leading-[1.12]">
                  you can trust.
                </div>
              </div>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-slate-500 max-w-md font-normal leading-relaxed">
                AI-powered security, built for your messages.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 sm:px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:scale-[1.03] active:scale-[0.98] transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="inline-flex items-center gap-3 rounded-full border border-slate-200/90 bg-white px-5 sm:px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-900 group-hover:bg-indigo-50">
                    <Play className="h-3.5 w-3.5 fill-slate-900 translate-x-0.5" />
                  </div>
                  <span>Watch Video</span>
                </button>
              </div>

              {/* Micro Guarantees */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  No server message logs
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                  On-device AI scam jury
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />
                  Keystroke & Face Biometrics
                </span>
              </div>
            </div>

            {/* Right Column: Dual Smartphone Mockup */}
            <div className="lg:col-span-7 xl:col-span-7 flex justify-center lg:justify-end">
              <InteractivePhones
                onOpenJuryModal={handleOpenJury}
                onOpenVideoChallenge={() => setIsFaceModalOpen(true)}
                onGetStarted={onGetStarted}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. FOUR SECURITY PILLARS SECTION (#features)                */}
      {/* ============================================================ */}
      <section id="features" className="py-20 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Four Layers of Zero-Trust Protection
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Engineered from the ground up so you never have to trust an intermediary server with your privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: E2EE */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4 hover:shadow-xl hover:bg-white hover:border-indigo-200 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                End-to-End Encryption
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Asymmetric RSA-OAEP 2048 key exchange combined with per-message AES-GCM 256. Private keys strictly remain in client IndexedDB.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Zero Server Exposure
                </span>
              </div>
            </div>

            {/* Card 2: AI Scam Jury */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4 hover:shadow-xl hover:bg-white hover:border-indigo-200 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                In-Browser AI Scam Jury
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                4 ML models (Decision Tree, Naive Bayes, k-NN, Neural Network) deliberate locally on message text with 98.3% accuracy without calling external APIs.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  98.30% Ensemble Acc
                </span>
              </div>
            </div>

            {/* Card 3: Keystroke Dynamics */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4 hover:shadow-xl hover:bg-white hover:border-indigo-200 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                <Fingerprint className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Continuous Keystroke Biometrics
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Measures microscopic millisecond dwell and flight times while typing. Automatically flags unauthorized device takeover without logging characters.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  Z-Score Anomaly Trigger
                </span>
              </div>
            </div>

            {/* Card 4: Facial Biometrics */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4 hover:shadow-xl hover:bg-white hover:border-indigo-200 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Consent-Based Facial Biometrics
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                MediaPipe 478-landmark 3D scanning captures scale-invariant geometric patterns for account registration and live challenge attestations.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-mono text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200">
                  64-D Geometric Vector
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. LIVE INTERACTIVE AI JURY SANDBOX (#live-demo)             */}
      {/* ============================================================ */}
      <section id="technology" className="py-20 bg-[#FAFBFD]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Interactive Test Bench
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Test the AI Scam Jury in Real Time
            </h2>
            <p className="text-sm text-slate-500">
              Evaluate any message with the client-side ensemble right now. Zero network requests made.
            </p>
          </div>

          {/* Sandbox Interactive Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Enter or Paste a Message to Deliberate
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  placeholder="e.g. Free gift card! Claim your $500 reward now..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={handleRunSandbox}
                  disabled={isEvaluating}
                  className="rounded-2xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 active:scale-95 transition-all shrink-0"
                >
                  {isEvaluating ? 'Deliberating...' : 'Evaluate Message'}
                </button>
              </div>
            </div>

            {/* Quick Samples */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-400">Sample Prompts:</span>
              <button
                type="button"
                onClick={() =>
                  setSandboxInput('URGENT: Your bank account is suspended. Verify password to unlock: http://bank-secure.net')
                }
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Bank Phishing
              </button>
              <button
                type="button"
                onClick={() =>
                  setSandboxInput('Congratulations! You won a $1,000 Walmart Gift Card! Click here to claim your code.')
                }
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Lottery Prize
              </button>
              <button
                type="button"
                onClick={() =>
                  setSandboxInput("Hey Aarav, can we reschedule our meeting to 3 PM tomorrow? Let me know!")
                }
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Legitimate Chat
              </button>
            </div>

            {/* Sandbox Evaluation Output */}
            {sandboxResult && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase">Jury Verdict:</span>
                    <span
                      className={`font-extrabold px-3 py-1 rounded-full text-xs shadow-xs ${
                        sandboxResult.verdict === 'SCAM'
                          ? 'bg-rose-500 text-white'
                          : sandboxResult.verdict === 'UNCERTAIN'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {sandboxResult.verdict} ({Math.round(sandboxResult.confidence * 100)}% Confidence)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {sandboxResult.voteCount} of 4 Jurors Voted SCAM
                  </span>
                </div>

                {/* Juror Voting Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400">Decision Tree</div>
                    <div className={`text-xs font-extrabold mt-1 ${sandboxResult.votes.decisionTree ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sandboxResult.votes.decisionTree ? 'SCAM' : 'SAFE'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400">Naive Bayes</div>
                    <div className={`text-xs font-extrabold mt-1 ${sandboxResult.votes.naiveBayes ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sandboxResult.votes.naiveBayes ? 'SCAM' : 'SAFE'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400">k-NN (k=5)</div>
                    <div className={`text-xs font-extrabold mt-1 ${sandboxResult.votes.knn ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sandboxResult.votes.knn ? 'SCAM' : 'SAFE'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400">Neural Net (ANN)</div>
                    <div className={`text-xs font-extrabold mt-1 ${sandboxResult.votes.ann ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sandboxResult.votes.ann ? 'SCAM' : 'SAFE'}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                  {sandboxResult.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. ABOUT & PRIVACY GUARANTEE SECTION (#about)                */}
      {/* ============================================================ */}
      <section id="about" className="py-20 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Our Privacy Manifesto
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Privacy by Design, Not by Policy
            </h2>
            <p className="text-sm text-slate-500">
              SafeChat is built on the philosophy that privacy should not rely on trusting corporations — it should be guaranteed by client-side mathematics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-200 p-6 space-y-3 bg-slate-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">Zero Server Decryption</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Messages are encrypted with AES-256 before leaving your computer. Neither SafeChat nor cloud hosts possess keys to decrypt content.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-6 space-y-3 bg-slate-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">Zero Biometric Clouds</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Facial landmark profiles and typing speed models remain in local browser memory. Raw images or videos are never sent over the wire.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-6 space-y-3 bg-slate-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-900">Verified Identity Channel</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compare public key fingerprints out-of-band to prevent adversary man-in-the-middle impersonation attacks.
              </p>
            </div>
          </div>

          {/* Bottom Call to Action Card */}
          <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-8 sm:p-12 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
            <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Experience the Future of Secure Messaging Today
            </h3>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-lg mx-auto">
              Open your encrypted channel with full AI scam defense and behavioral identity biometrics in seconds.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-indigo-900 shadow-xl hover:bg-indigo-50 active:scale-95 transition-all"
              >
                <span>Launch SafeChat Messenger</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. FOOTER                                                    */}
      {/* ============================================================ */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Shield className="h-4 w-4 fill-white" />
            </div>
            <span className="text-sm font-extrabold text-slate-900">
              SAFE<span className="text-indigo-600">CHAT</span>
            </span>
          </div>

          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} SafeChat. End-to-End Encrypted & Client-Side AI Biometrics.
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(true)}
              className="hover:text-indigo-600 transition-colors"
            >
              Tour Video
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('technology', 'technology')}
              className="hover:text-indigo-600 transition-colors"
            >
              Technology
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="text-indigo-600 font-bold hover:underline"
            >
              Get Started →
            </button>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* MODALS TRIGGERED FROM LANDING PAGE                           */}
      {/* ============================================================ */}
      <WatchVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onGetStarted={onGetStarted}
      />

      {juryModalMessage && (
        <AIJuryModal
          isOpen={Boolean(juryModalMessage)}
          onClose={() => setJuryModalMessage(null)}
          result={juryResult}
          messageText={juryModalMessage}
        />
      )}

      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        userId="demo_landing_user"
        challenge={null}
      />

      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onOpenFaceEnroll={() => {
          setIsSecurityModalOpen(false);
          setIsFaceModalOpen(true);
        }}
      />
    </div>
  );
};
