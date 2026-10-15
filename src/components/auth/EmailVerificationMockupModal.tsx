import React, { useState } from 'react';
import {
  X,
  Shield,
  ArrowLeft,
  Mail,
  Printer,
  ExternalLink,
  Star,
  Clock,
  Send,
  File,
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  CornerUpLeft,
  CornerUpRight,
  Smile,
} from 'lucide-react';

interface EmailVerificationMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  otpCode: string;
  onAutoFillCode: (code: string) => void;
}

export const EmailVerificationMockupModal: React.FC<EmailVerificationMockupModalProps> = ({
  isOpen,
  onClose,
  email,
  otpCode,
  onAutoFillCode,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDigits = otpCode.split('').join('  ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] max-h-[760px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Top Gmail App Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white font-bold text-sm">
                M
              </div>
              <span className="font-semibold text-slate-800 text-sm">Gmail</span>
            </div>
            <div className="hidden sm:flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-xs text-slate-500 w-80">
              <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" />
              <span>Search mail</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onAutoFillCode(otpCode);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Use Code in SafeChat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Gmail Body Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Mini Sidebar */}
          <div className="hidden md:flex w-52 flex-col justify-between border-r border-slate-100 bg-slate-50/70 p-3 select-none text-xs">
            <div className="space-y-1">
              <button
                type="button"
                className="mb-3 flex items-center gap-2 rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-2.5 font-semibold text-indigo-700 shadow-xs"
              >
                <Mail className="h-4 w-4" />
                <span>Compose</span>
              </button>

              <div className="flex items-center justify-between rounded-xl bg-indigo-100/70 px-3 py-2 font-semibold text-indigo-900">
                <span className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span>Inbox</span>
                </span>
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white font-bold">
                  1
                </span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl">
                <Star className="h-4 w-4 text-slate-400" />
                <span>Starred</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Snoozed</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl">
                <Send className="h-4 w-4 text-slate-400" />
                <span>Sent</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl">
                <File className="h-4 w-4 text-slate-400" />
                <span>Drafts</span>
              </div>

              <div className="pt-3 border-t border-slate-200/60 mt-3">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-3 mb-1 tracking-wider">
                  Labels
                </div>
                <div className="flex items-center gap-2 px-3 py-1 text-slate-600 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span>Personal</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 text-slate-600 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span>College</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 text-slate-600 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Projects</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50/80 p-2 text-[10px] text-indigo-700 text-center border border-indigo-100">
              Interactive Email Inbox View
            </div>
          </div>

          {/* Right Message View */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-2.5 text-slate-500 text-xs">
              <div className="flex items-center gap-4">
                <button type="button" className="hover:text-slate-800" title="Back">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button type="button" className="hover:text-slate-800" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" className="hover:text-slate-800" title="Mark as unread">
                  <Mail className="h-4 w-4" />
                </button>
                <button type="button" className="hover:text-slate-800" title="Snooze">
                  <Clock className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Printer className="h-4 w-4 hover:text-slate-800 cursor-pointer" />
                <ExternalLink className="h-4 w-4 hover:text-slate-800 cursor-pointer" />
              </div>
            </div>

            {/* Email Content Area with smooth scrolling */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
              {/* Subject Line */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    SafeChat Verification Code: {otpCode}
                  </h2>
                  <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                    Inbox
                  </span>
                </div>
                <div className="text-xs text-slate-400">Just now</div>
              </div>

              {/* Sender Info */}
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">SafeChat</span>
                      <span className="text-xs text-slate-400">&lt;no-reply@safechat.app&gt;</span>
                    </div>
                    <div className="text-[11px] text-slate-500">to me ({email})</div>
                  </div>
                </div>
              </div>

              {/* The Styled SafeChat Email Template (Matching Image 4) */}
              <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-b from-white via-indigo-50/20 to-purple-50/30 p-6 sm:p-10 shadow-lg text-center">
                {/* SafeChat Brand */}
                <div className="flex items-center justify-center gap-2.5 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-base font-extrabold tracking-wider text-slate-900">
                    SAFECHAT
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Verify Your Email Address
                </h1>
                <p className="mx-auto max-w-md text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                  Welcome to SafeChat. Use the one-time verification code below to verify your email and secure your account.
                </p>

                {/* 6-Digit Code Box */}
                <div className="relative mx-auto my-6 max-w-xs rounded-2xl border-2 border-indigo-200 bg-indigo-50/80 py-4 px-6 shadow-inner">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-[0.4em] text-indigo-700 font-mono">
                    {formattedDigits}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-xs transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-2 font-medium">
                  This code expires in <span className="font-bold text-slate-700">15 minutes</span>.
                </p>
                <p className="text-[11px] text-slate-400 mb-6">
                  If you did not request this, you can safely ignore this email.
                </p>

                {/* Tip Notice */}
                <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left flex items-start gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Tip:</span> Check your Spam or Promotions folder if you cannot find future emails.
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200/60 pt-4 text-[11px] text-slate-400">
                  <div className="font-medium text-slate-500">SafeChat • Private. Secure. Intelligent.</div>
                  <div className="mt-0.5">Never share this code with anyone.</div>
                </div>
              </div>

              {/* Bottom Quick Reply Action Bar */}
              <div className="mt-6 flex items-center gap-3 max-w-xl mx-auto">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <CornerUpLeft className="h-3.5 w-3.5" />
                  <span>Reply</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <CornerUpRight className="h-3.5 w-3.5" />
                  <span>Forward</span>
                </button>
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
