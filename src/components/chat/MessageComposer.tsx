import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, AlertTriangle, Fingerprint, ShieldAlert } from 'lucide-react';
import { KeystrokeCollector } from '../../lib/keystroke';
import { evaluateMessageWithAIJury } from '../../lib/aiJury';
import type { AIJuryResult, KeystrokeRiskReport } from '../../lib/types';


interface MessageComposerProps {
  userId: string;
  onSendMessage: (text: string, juryResult: AIJuryResult) => Promise<void>;
  onTriggerFaceChallenge?: () => void;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  userId,
  onSendMessage,
  onTriggerFaceChallenge,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [keystrokeReport, setKeystrokeReport] = useState<KeystrokeRiskReport>({
    status: 'learning',
    anomalyScore: 0,
    dwellDeviationZ: 0,
    flightDeviationZ: 0,
    isRiskAlert: false,
    sampleCount: 0,
    enrolledMessageCount: 0,
    isCalibrated: false,
  });
  const [previewJury, setPreviewJury] = useState<AIJuryResult | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const collectorRef = useRef<KeystrokeCollector>(new KeystrokeCollector(userId));

  useEffect(() => {
    collectorRef.current.setUserId(userId);
  }, [userId]);

  // Real-time local evaluation of keystroke dynamics and pre-scan for scam flags
  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Keystroke dynamics analysis
    const report = collectorRef.current.analyzeAndEvaluate();
    setKeystrokeReport(report);

    // Lightweight pre-scan with AI Jury if message is sufficiently long
    if (val.trim().length > 12) {
      const jury = await evaluateMessageWithAIJury(val);
      if (jury.verdict === 'SCAM' || jury.verdict === 'UNCERTAIN') {
        setPreviewJury(jury);
      } else {
        setPreviewJury(null);
      }
    } else {
      setPreviewJury(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    collectorRef.current.handleKeyDown(e);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    collectorRef.current.handleKeyUp(e);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    try {
      // Run AI Jury evaluation on plaintext before encrypting
      const juryResult = await evaluateMessageWithAIJury(trimmed);
      await onSendMessage(trimmed, juryResult);

      setText('');
      setPreviewJury(null);
      collectorRef.current.commitMessageBaseline();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  return (
    <div className="relative border-t border-slate-800 bg-slate-900/90 p-3 sm:p-4 backdrop-blur-xl">
      {/* Keystroke Anomaly or Scam Warning Alert Bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {/* Keystroke Dynamics Pill */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
          <span>Keystroke Rhythm:</span>
          {keystrokeReport.status === 'opted_out' ? (
            <span className="text-slate-500 font-medium">Monitoring Inactive (Opted-Out)</span>
          ) : keystrokeReport.status === 'learning' ? (
            <span className="text-cyan-400 font-medium">
              Calibrating ({keystrokeReport.sampleCount}/30 keys)
            </span>
          ) : keystrokeReport.isRiskAlert ? (
            <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              <AlertTriangle className="h-3 w-3" />
              Behavioral Anomaly (Z: {keystrokeReport.dwellDeviationZ})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Verified Profile Match
            </span>
          )}
        </div>

        {/* Identity Alert Trigger Button if Anomaly Detected */}
        {keystrokeReport.isRiskAlert && onTriggerFaceChallenge && (
          <button
            type="button"
            onClick={onTriggerFaceChallenge}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow transition-all active:scale-95"
          >
            <ShieldAlert className="h-3 w-3" />
            Verify Identity With Camera
          </button>
        )}
      </div>

      {/* Real-time Pre-Scan Scam Notification if typing risky text */}
      {previewJury && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="text-[11px]">
              <strong>AI Jury Alert:</strong> Your draft contains patterns ({previewJury.threatKeywords.join(', ') || 'High risk phrasing'}) that may trigger scam warnings for the recipient.
            </span>
          </div>
        </div>
      )}

      {/* Input Composer Field */}
      <div className="flex items-end gap-2.5">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={disabled}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder={
              disabled
                ? 'Select a conversation to begin...'
                : 'Write an end-to-end encrypted message...'
            }
            className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isSending || disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950 hover:bg-emerald-500 disabled:opacity-40 transition-all active:scale-95"
          title="Send Encrypted Message (Enter)"
        >
          {isSending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <Lock className="h-2.5 w-2.5 text-emerald-400" />
          <span>E2EE: Plaintext encrypted before transmission.</span>
        </div>
        <span>Press Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  );
};
