import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Settings,
  ChevronLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Database,
  Pencil,
  Check,
  X,
  Loader2,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { FaceRegistrationScanner } from './FaceRegistrationScanner';
import { EmailVerificationMockupModal } from './EmailVerificationMockupModal';
import { SmtpSettingsModal } from './SmtpSettingsModal';
import { checkUsernameAvailable, checkEmailAvailable } from '../../lib/supabase';

interface AuthModalProps {
  onBackToLanding?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onBackToLanding }) => {
  const { signIn, sendOtp, verifyOtp } = useAuth();
  
  // Navigation tabs: 'signin' | 'register'
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  
  // OTP flow mode
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState<number>(30);
  const [activeOtpCode, setActiveOtpCode] = useState<string>('482731');
  const [isEmailMockupOpen, setIsEmailMockupOpen] = useState(false);
  const [isSmtpConfigOpen, setIsSmtpConfigOpen] = useState(false);
  const [smtpStatusInfo, setSmtpStatusInfo] = useState<{ sent: boolean; message: string } | null>(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  
  // Username uniqueness validation
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Email availability validation
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);

  // Registration face scan step: 'scan' | 'details'
  const [registerStep, setRegisterStep] = useState<'scan' | 'details'>('scan');
  const [capturedFacePattern, setCapturedFacePattern] = useState<number[] | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // OTP inputs ref
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOtpStep && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpStep, otpCountdown]);

  // Debounced username availability validation
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || activeTab !== 'register') {
      setUsernameValid(null);
      setUsernameError(null);
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUser)) {
      setUsernameValid(false);
      setUsernameError('3-24 characters (letters, numbers, underscores only)');
      return;
    }

    let isMounted = true;
    setUsernameChecking(true);
    const timeout = setTimeout(async () => {
      const res = await checkUsernameAvailable(cleanUser);
      if (isMounted) {
        setUsernameChecking(false);
        setUsernameValid(res.available);
        setUsernameError(res.error || null);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [username, activeTab]);

  // Debounced email availability validation
  useEffect(() => {
    const cleanMail = email.trim().toLowerCase();
    if (!cleanMail || activeTab !== 'register' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanMail)) {
      setEmailChecking(false);
      setEmailInUse(false);
      return;
    }

    let isMounted = true;
    setEmailChecking(true);
    const timeout = setTimeout(async () => {
      const res = await checkEmailAvailable(cleanMail);
      if (isMounted) {
        setEmailChecking(false);
        if (!res.available) {
          setEmailInUse(true);
        } else {
          setEmailInUse(false);
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [email, activeTab]);

  const handlePatternCaptured = (descriptor: number[], previewUrl: string) => {
    setCapturedFacePattern(descriptor);
    setCapturedPreviewUrl(previewUrl);
    setError(null);
  };

  const handleResetPattern = () => {
    setCapturedFacePattern(null);
    setCapturedPreviewUrl(null);
    setRegisterStep('scan');
  };

  // OTP input handling
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    // Auto focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otpValues];
      pasted.split('').forEach((char, idx) => {
        if (idx < 6) newOtp[idx] = char;
      });
      setOtpValues(newOtp);
      const focusIndex = Math.min(5, pasted.length);
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  // Sign In or Register Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'register') {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          setError('Please provide a valid email address.');
          setIsLoading(false);
          return;
        }

        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }

        if (!capturedFacePattern || capturedFacePattern.length === 0) {
          setError('Please scan your face first to store your identity baseline pattern.');
          setRegisterStep('scan');
          setIsLoading(false);
          return;
        }

        const cleanUser = username.trim().toLowerCase();
        if (!cleanUser) {
          setError('Please choose a unique username.');
          setIsLoading(false);
          return;
        }

        // Live pre-check of username availability before proceeding
        const userCheck = await checkUsernameAvailable(cleanUser);
        if (!userCheck.available) {
          setError(userCheck.error || `The username "@${cleanUser}" is already taken. Please choose another username.`);
          setUsernameValid(false);
          setUsernameError(userCheck.error || 'Already taken');
          setIsLoading(false);
          return;
        }

        if (usernameValid === false) {
          setError(usernameError || 'Please choose an available unique username.');
          setIsLoading(false);
          return;
        }

        if (!displayName.trim()) {
          setError('Please provide a display name.');
          setIsLoading(false);
          return;
        }

        // STEP 1: Check if email already exists in profiles
        const emailCheck = await checkEmailAvailable(cleanEmail);
        if (!emailCheck.available) {
          setError('This email address is already in use. Please sign in instead.');
          setEmailInUse(true);
          setIsLoading(false);
          return; // STOP: do not send OTP and do not advance to OTP screen!
        }

        // STEP 2: Dispatch 6-digit OTP code to email via SMTP and open OTP verification screen
        const otpRes = await sendOtp(cleanEmail, username.trim(), displayName.trim(), capturedFacePattern, password);
        setActiveOtpCode(otpRes.otpCode);
        setIsOtpStep(true);
        setOtpCountdown(30);
        if (otpRes.smtpSent) {
          setSmtpStatusInfo({ sent: true, message: `Real 6-digit OTP code sent to ${cleanEmail} via SMTP!` });
        } else if (otpRes.smtpError) {
          setSmtpStatusInfo({ sent: false, message: otpRes.smtpError });
        } else {
          setSmtpStatusInfo(null);
        }
      } else {
        // Sign in with password
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpValues.join('');
    if (token.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await verifyOtp(email, token, {
        password,
        displayName: displayName || email.split('@')[0],
        username: username || email.split('@')[0],
        facePattern: capturedFacePattern || undefined,
      });

      if (res.error) {
        setError(res.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await sendOtp(email, username, displayName, capturedFacePattern || undefined, password);
      setActiveOtpCode(res.otpCode);
      setOtpCountdown(30);
      setOtpValues(['', '', '', '', '', '']);
      if (res.smtpSent) {
        setSmtpStatusInfo({ sent: true, message: `Real 6-digit OTP code sent to ${email} via SMTP!` });
      } else if (res.smtpError) {
        setSmtpStatusInfo({ sent: false, message: res.smtpError });
      } else {
        setSmtpStatusInfo(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center pastel-aurora-bg p-4 sm:p-6 font-sans selection:bg-purple-200 selection:text-purple-900 overflow-y-auto custom-scrollbar">
      {/* Decorative Peripheral Floating Feature Badges (Matching Image 2 & 3) */}
      <div className="pointer-events-none absolute inset-0 hidden xl:block overflow-hidden">
        {/* Top-Left: Private Conversations */}
        <div className="absolute top-28 left-20 animate-bounce duration-1000 flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-3.5 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Private</div>
            <div className="text-[11px] text-slate-500">Conversations</div>
          </div>
        </div>

        {/* Bottom-Left: You Control Your Data */}
        <div className="absolute bottom-28 left-24 flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-3.5 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">You Control</div>
            <div className="text-[11px] text-slate-500">Your Data</div>
          </div>
        </div>

        {/* Top-Right: Advanced Identity Protection */}
        <div className="absolute top-36 right-20 flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-3.5 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Advanced Identity</div>
            <div className="text-[11px] text-slate-500">Protection</div>
          </div>
        </div>

        {/* Bottom-Right: Secure People Conversations */}
        <div className="absolute bottom-32 right-24 flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-3.5 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Secure People</div>
            <div className="text-[11px] text-slate-500">Conversations</div>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Card (Matching Image 2 / Image 3) */}
      <div className="relative w-full max-w-md my-auto">
        <div className="glass-card rounded-[2.5rem] p-7 sm:p-9 shadow-2xl border border-white/80 max-h-[92vh] overflow-y-auto custom-scrollbar">
          
          {/* Top Brand Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-300/50">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              SafeChat
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              High-Assurance Privacy & Real-Time E2EE Messaging
            </p>
          </div>

          {/* BACK BUTTON & CONTROLS */}
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (isOtpStep) {
                  setIsOtpStep(false);
                } else if (onBackToLanding) {
                  onBackToLanding();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{isOtpStep ? 'Back to Form' : 'Back to Overview'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsSmtpConfigOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full transition-colors"
                title="Configure custom SMTP mail server credentials"
              >
                <Server className="h-3 w-3" />
                <span>SMTP Mail</span>
              </button>

              {isOtpStep && (
                <button
                  type="button"
                  onClick={() => setIsEmailMockupOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full transition-colors"
                  title="View Gmail email preview mockup"
                >
                  <Mail className="h-3 w-3" />
                  <span>Preview</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW A: OTP VERIFICATION SCREEN (Matching Image 3) */}
          {isOtpStep ? (
            <div className="space-y-6 animate-in fade-in duration-200 text-center">
              {/* Illustration Envelope with rays */}
              <div className="relative mx-auto flex h-24 w-28 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-purple-200/40 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-24 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl">
                  <div className="h-6 w-16 -mt-3 rounded-lg bg-white/90 shadow-xs flex items-center justify-center border border-indigo-200">
                    <span className="block h-1 w-10 rounded-full bg-indigo-400" />
                  </div>
                  <Mail className="h-7 w-7 mt-1.5 text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
                <p className="text-xs text-slate-500 mt-1">
                  We've sent a 6-digit verification code to
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => setIsOtpStep(false)}
                    className="hover:text-indigo-900"
                    title="Edit Email"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>

                {/* Real SMTP Delivery Status Callout */}
                {smtpStatusInfo && (
                  <div
                    className={`mt-3 rounded-2xl p-3 text-xs flex items-center justify-between gap-2 border text-left ${
                      smtpStatusInfo.sent
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {smtpStatusInfo.sent ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <span className="leading-snug">{smtpStatusInfo.message}</span>
                    </div>
                    {!smtpStatusInfo.sent && (
                      <button
                        type="button"
                        onClick={() => setIsSmtpConfigOpen(true)}
                        className="shrink-0 font-bold underline hover:text-amber-950 ml-1 text-[11px]"
                      >
                        Set SMTP
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* 6 Digit Inputs */}
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="h-12 w-11 sm:h-14 sm:w-12 rounded-2xl border-2 border-slate-200 bg-white/90 text-center text-lg sm:text-xl font-bold text-slate-900 shadow-sm focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
                    />
                  ))}
                </div>

                <div className="text-xs text-slate-500">
                  Didn't receive the code?{' '}
                  {otpCountdown > 0 ? (
                    <span className="font-semibold text-indigo-600">
                      Resend in 00:{otpCountdown < 10 ? `0${otpCountdown}` : otpCountdown}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50"
                    >
                      Resend OTP code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpValues.join('').length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-300 hover:shadow-indigo-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white/80 px-3 text-slate-400">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOtpStep(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : (
            /* VIEW B: SIGN IN / REGISTER FORM (Matching Image 2) */
            <div className="space-y-5">
              {/* Segmented Control Pill (Sign In | Create Account) */}
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100/80 p-1 border border-slate-200/60 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setError(null);
                  }}
                  className={`rounded-xl py-2.5 transition-all duration-150 ${
                    activeTab === 'signin'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError(null);
                  }}
                  className={`rounded-xl py-2.5 transition-all duration-150 ${
                    activeTab === 'register'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                  {error.toLowerCase().includes('already in use') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signin');
                        setError(null);
                      }}
                      className="shrink-0 font-bold text-indigo-600 hover:text-indigo-800 underline ml-2"
                    >
                      Sign In →
                    </button>
                  )}
                </div>
              )}

              {/* Registration Sub-Step 1: Face Biometric Capture */}
              {activeTab === 'register' && registerStep === 'scan' ? (
                <div className="space-y-4">
                  <FaceRegistrationScanner
                    onPatternCaptured={handlePatternCaptured}
                    onResetPattern={handleResetPattern}
                    capturedPattern={capturedFacePattern}
                    capturedPreviewUrl={capturedPreviewUrl}
                  />

                  {capturedFacePattern && (
                    <button
                      type="button"
                      onClick={() => setRegisterStep('details')}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      <span>Proceed to Account Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                /* Registration Step 2 OR Sign In Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* If in register mode, show back to scan link */}
                  {activeTab === 'register' && (
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="font-semibold text-slate-700">Account Credentials</span>
                      <button
                        type="button"
                        onClick={() => setRegisterStep('scan')}
                        className="text-indigo-600 hover:underline"
                      >
                        ← Re-scan Face
                      </button>
                    </div>
                  )}

                  {/* USERNAME (Primary Unique Key during registration) */}
                  {activeTab === 'register' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Unique Username <span className="text-purple-600">*</span>
                        </label>
                        {usernameChecking ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                          </span>
                        ) : usernameValid === true ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Unique & Available
                          </span>
                        ) : usernameValid === false ? (
                          <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                            <X className="h-3 w-3" /> {usernameError || 'Taken'}
                          </span>
                        ) : null}
                      </div>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold text-xs">
                          @
                        </div>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''))}
                          placeholder="unique_username"
                          className={`w-full rounded-2xl border bg-white/90 py-3 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                            usernameValid === true
                              ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100'
                              : usernameValid === false
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                              : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* DISPLAY NAME (Register only) */}
                  {activeTab === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Display Name <span className="text-purple-600">*</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Pranesh"
                          className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* EMAIL ADDRESS */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Email Address <span className="text-purple-600">*</span>
                      </label>
                      {activeTab === 'register' && emailChecking ? (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                        </span>
                      ) : activeTab === 'register' && emailInUse ? (
                        <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                          <X className="h-3 w-3" /> Already in use
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailInUse(false);
                          setError(null);
                        }}
                        placeholder="name@example.com"
                        className={`w-full rounded-2xl border bg-white/90 py-3 pl-10 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                          emailInUse
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                        }`}
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON (Gradient Pill Matching Image 2) */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-300/60 hover:shadow-purple-400/80 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{activeTab === 'signin' ? 'Sign In Securely' : 'Create Account & Send OTP'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* CRYPTOGRAPHIC GUARANTEES (Matching Image 2 footer) */}
              <div className="pt-4 border-t border-slate-200/60 space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cryptographic Guarantees
                </div>

                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <span>Client-Side RSA-OAEP & AES-GCM 256 E2EE</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-500">
                      <Database className="h-3.5 w-3.5" />
                    </div>
                    <span>Zero server exposure: private keys stay in IndexedDB</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <Fingerprint className="h-3.5 w-3.5" />
                    </div>
                    <span>On-Device Face Biometrics & Continuous Keystroke Dynamics</span>
                  </div>
                </div>
              </div>

              {/* Bottom links (Supabase Backend | SMTP Mail | Settings) */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(true)}
                  className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
                >
                  <Database className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Supabase Backend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSmtpConfigOpen(true)}
                  className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-purple-600" />
                  <span>SMTP Mail</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfigOpen(true)}
                  className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supabase Config Modal */}
      <SupabaseConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

      {/* SMTP Mail Configuration Modal */}
      <SmtpSettingsModal
        isOpen={isSmtpConfigOpen}
        onClose={() => setIsSmtpConfigOpen(false)}
        onConfigSaved={() => {
          if (isOtpStep && email) {
            handleResendOtp();
          }
        }}
      />

      {/* Gmail Email Verification Code Preview Modal (Matching Image 4) */}
      <EmailVerificationMockupModal
        isOpen={isEmailMockupOpen}
        onClose={() => setIsEmailMockupOpen(false)}
        email={email || 'praneshsph786@gmail.com'}
        otpCode={activeOtpCode}
        onAutoFillCode={(code) => {
          setOtpValues(code.split('').slice(0, 6));
        }}
      />
    </div>
  );
};
