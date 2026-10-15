import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Server,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  EyeOff,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  getStoredSmtpConfig,
  saveStoredSmtpConfig,
  clearStoredSmtpConfig,
  testSmtpConnection,
  sendOtpViaSmtp,
  type SmtpConfig,
} from '../../lib/smtp';

interface SmtpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: SmtpConfig) => void;
}

export const SmtpSettingsModal: React.FC<SmtpSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(465);
  const [secure, setSecure] = useState(true);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [from, setFrom] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTestMail, setSendingTestMail] = useState(false);
  const [testMailResult, setTestMailResult] = useState<{ success: boolean; message: string } | null>(null);

  const [showGmailHelp, setShowGmailHelp] = useState(false);

  // Load existing credentials on open
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredSmtpConfig();
      if (stored) {
        setHost(stored.host || 'smtp.gmail.com');
        setPort(stored.port || 465);
        setSecure(stored.secure !== undefined ? stored.secure : true);
        setUser(stored.user || '');
        setPass(stored.pass || '');
        setFrom(stored.from || '');
        setTestRecipient(stored.user || '');
      } else {
        // Fetch server env default preview if available
        fetch('/api/smtp-config')
          .then((res) => res.json())
          .then((data) => {
            if (data?.host) setHost(data.host);
            if (data?.port) setPort(data.port);
            if (data?.from) setFrom(data.from);
          })
          .catch(() => {});
      }
      setTestResult(null);
      setTestMailResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: 'gmail' | 'outlook' | 'brevo') => {
    if (preset === 'gmail') {
      setHost('smtp.gmail.com');
      setPort(465);
      setSecure(true);
      setShowGmailHelp(true);
    } else if (preset === 'outlook') {
      setHost('smtp.office365.com');
      setPort(587);
      setSecure(false);
      setShowGmailHelp(false);
    } else if (preset === 'brevo') {
      setHost('smtp-relay.brevo.com');
      setPort(587);
      setSecure(false);
      setShowGmailHelp(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user.trim() || !pass.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both SMTP user/email and password.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const config: SmtpConfig = {
      host: host.trim(),
      port: Number(port),
      secure,
      user: user.trim(),
      pass: pass.trim(),
      from: from.trim() || `SafeChat <${user.trim()}>`,
    };

    const res = await testSmtpConnection(config);
    setTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: res.message || 'SMTP connection verified successfully!',
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Connection failed. Check your host, port, and credentials.',
      });
    }
  };

  const handleSendTestMail = async () => {
    const target = testRecipient.trim() || user.trim();
    if (!target) {
      setTestMailResult({
        success: false,
        message: 'Please enter an email address to send the test OTP to.',
      });
      return;
    }

    setSendingTestMail(true);
    setTestMailResult(null);

    const config: SmtpConfig = {
      host: host.trim(),
      port: Number(port),
      secure,
      user: user.trim(),
      pass: pass.trim(),
      from: from.trim() || `SafeChat <${user.trim()}>`,
    };

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const res = await sendOtpViaSmtp(target, randomOtp, config);
    setSendingTestMail(false);

    if (res.success) {
      setTestMailResult({
        success: true,
        message: `Success! Sent 6-digit test OTP (${randomOtp}) to ${target}. Check your inbox!`,
      });
    } else {
      setTestMailResult({
        success: false,
        message: res.error || 'Failed to send test email.',
      });
    }
  };

  const handleSave = () => {
    if (!user.trim() || !pass.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both SMTP user/email and password.',
      });
      return;
    }

    const config: SmtpConfig = {
      host: host.trim(),
      port: Number(port),
      secure,
      user: user.trim(),
      pass: pass.trim(),
      from: from.trim() || `SafeChat <${user.trim()}>`,
    };

    saveStoredSmtpConfig(config);
    if (onConfigSaved) onConfigSaved(config);
    onClose();
  };

  const handleClear = () => {
    clearStoredSmtpConfig();
    setUser('');
    setPass('');
    setFrom('');
    setTestResult(null);
    setTestMailResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">SMTP Mail Server Settings</h2>
              <p className="text-xs text-slate-500">
                Send authentic 6-digit OTP codes directly from your own email account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Provider Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('gmail')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  host === 'smtp.gmail.com'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Gmail</span>
                <span className="text-[10px] text-slate-400">(465 SSL)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('outlook')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  host === 'smtp.office365.com'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Outlook / 365</span>
                <span className="text-[10px] text-slate-400">(587)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('brevo')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  host === 'smtp-relay.brevo.com'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Brevo / Relay</span>
                <span className="text-[10px] text-slate-400">(587)</span>
              </button>
            </div>
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-700">SMTP Host</label>
              <div className="relative">
                <Server className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setPort(p);
                  if (p === 465) setSecure(true);
                  if (p === 587) setSecure(false);
                }}
                placeholder="465"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Secure SSL Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-800">SSL / TLS Encryption</span>
                <p className="text-[11px] text-slate-500">
                  {secure ? 'Enabled (Default for port 465)' : 'Disabled / STARTTLS (Default for port 587)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSecure(!secure)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                secure ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  secure ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Username / Email */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              SMTP Username / Mailbox Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Password / App Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                SMTP Password or App Password
              </label>
              <button
                type="button"
                onClick={() => setShowGmailHelp(!showGmailHelp)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Using Gmail? Read this</span>
              </button>
            </div>
            <div className="relative">
              <Key className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="e.g. 16-character Google App Password (abcd efgh ijkl mnop)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Gmail App Password Instructions Callout */}
          {showGmailHelp && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 text-indigo-600" />
                  Generating a Gmail 16-Character App Password
                </span>
                <button
                  type="button"
                  onClick={() => setShowGmailHelp(false)}
                  className="text-indigo-400 hover:text-indigo-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11.5px] leading-relaxed">
                <li>
                  Go to{' '}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 underline"
                  >
                    Google Account Security
                  </a>
                </li>
                <li>Make sure <strong>2-Step Verification</strong> is ON</li>
                <li>
                  Search for <strong>"App Passwords"</strong> in the top search bar
                </li>
                <li>Type App Name: <strong>SafeChat</strong> and click Create</li>
                <li>Copy the 16-character code (without spaces) and paste it into the password box above!</li>
              </ol>
            </div>
          )}

          {/* Sender Header */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Sender Name / Address (Optional)
            </label>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={`SafeChat <${user || 'no-reply@safechat.app'}>`}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`rounded-2xl p-3.5 text-xs flex items-start gap-2.5 border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          {/* Test Send Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-indigo-600" />
              Send a Real Test OTP Email
            </span>
            <div className="flex gap-2">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="recipient-email@example.com"
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendTestMail}
                disabled={sendingTestMail || !user || !pass}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-all shrink-0"
              >
                {sendingTestMail ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send Test</span>
              </button>
            </div>

            {testMailResult && (
              <div
                className={`rounded-xl p-2.5 text-xs flex items-start gap-2 border ${
                  testMailResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testMailResult.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                )}
                <div className="text-[11px] leading-tight">{testMailResult.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !user || !pass}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-xs"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Test Connection</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
