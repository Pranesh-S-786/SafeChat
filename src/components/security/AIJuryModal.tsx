import React from 'react';
import { X, ShieldAlert, ShieldCheck, HelpCircle, AlertTriangle, Cpu, Scale } from 'lucide-react';
import type { AIJuryResult } from '../../lib/types';


interface AIJuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AIJuryResult | null;
  messageText?: string;
}

export const AIJuryModal: React.FC<AIJuryModalProps> = ({
  isOpen,
  onClose,
  result,
  messageText,
}) => {
  if (!isOpen || !result) return null;

  const isScam = result.verdict === 'SCAM';
  const isUncertain = result.verdict === 'UNCERTAIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                isScam
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : isUncertain
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">AI Jury Ensemble Deliberation</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isScam
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isUncertain
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {result.verdict}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent voting deliberation across 4 distinct machine learning classifiers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Inspected Message Excerpt */}
          {messageText && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Inspected Message Content (Decrypted In-Browser)
              </div>
              <div className="text-xs text-slate-200 italic font-mono bg-slate-900/50 p-2 rounded border border-slate-800/60">
                "{messageText}"
              </div>
            </div>
          )}

          {/* Verdict Overview Banner */}
          <div
            className={`rounded-xl p-4 border flex items-start gap-3.5 ${
              isScam
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                : isUncertain
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
            }`}
          >
            {isScam ? (
              <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            ) : isUncertain ? (
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            ) : (
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="text-xs font-semibold">
                {result.explanation}
              </div>
              <div className="text-[11px] opacity-80">
                Voting consensus: <strong>{result.voteCount} of 4</strong> jurors voted SCAM. Estimated threat probability:{' '}
                <strong>{Math.round(result.confidence * 100)}%</strong>.
              </div>
            </div>
          </div>

          {/* 4 Jurors Grid */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              Juror Vote Breakdown
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Juror 1: Decision Tree */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-200">1. Decision Tree</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      result.votes.decisionTree
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {result.votes.decisionTree ? 'VOTED SCAM' : 'VOTED SAFE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Traverses hierarchical split nodes based on TF-IDF word frequency thresholds (95.17% benchmark accuracy).
                </p>
              </div>

              {/* Juror 2: Naive Bayes */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-200">2. Naive Bayes</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      result.votes.naiveBayes
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {result.votes.naiveBayes ? 'VOTED SCAM' : 'VOTED SAFE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Evaluates conditional log-likelihood term probabilities across class priors (97.77% benchmark accuracy).
                </p>
              </div>

              {/* Juror 3: k-NN */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-200">3. k-Nearest Neighbors</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      result.votes.knn
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {result.votes.knn ? 'VOTED SCAM' : 'VOTED SAFE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Computes vector cosine similarity against cluster exemplar centroids (96.87% benchmark accuracy).
                </p>
              </div>

              {/* Juror 4: ANN */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-200">4. Neural Net (ANN)</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      result.votes.ann
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {result.votes.ann ? 'VOTED SCAM' : 'VOTED SAFE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Multilayer perceptron dense forward pass with non-linear ReLU activations (98.39% benchmark accuracy).
                </p>
              </div>
            </div>
          </div>

          {/* Detected Threat Patterns */}
          {result.threatKeywords.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                Matched Threat Heuristic Patterns
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.threatKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs text-rose-300"
                  >
                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safety Disclaimer */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-[11px] text-slate-400 flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-slate-300">Mandatory Security Disclaimer:</strong> {result.disclaimer}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Close Deliberation
          </button>
        </div>
      </div>
    </div>
  );
};
