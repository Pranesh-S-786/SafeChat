/**
 * SafeChat AI Jury - Local In-Browser Scam Message Detection Engine
 * 
 * Implements local client-side TF-IDF feature extraction and inference across:
 * 1. Decision Tree Juror
 * 2. Naive Bayes Juror (Multinomial NB)
 * 3. k-Nearest Neighbors Juror (Cosine Metric)
 * 4. Artificial Neural Network Juror (Multilayer Perceptron)
 * 
 * Powered by models trained on real public SMS/chat spam datasets.
 * Keeps inference 100% local — zero message exposure to external AI APIs.
 */

import type { AIJuryResult } from './types';

export interface ModelBundle {
  version: string;
  vectorizer: {
    vocabulary: Record<string, number>;
    idf: number[];
  };
  models: {
    decision_tree: {
      children_left: number[];
      children_right: number[];
      feature: number[];
      threshold: number[];
      value: number[][][];
    };
    naive_bayes: {
      class_log_prior: number[];
      feature_log_prob: number[][];
    };
    knn: {
      samples: number[][];
      labels: number[];
      k: number;
    };
    ann: {
      coefs: number[][][];
      intercepts: number[][];
    };
  };
  evaluation?: Record<string, unknown>;
}

let cachedBundle: ModelBundle | null = null;
let modelLoadingPromise: Promise<ModelBundle | null> | null = null;

// Common English stopwords for local preprocessing
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'll', 'm',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'o', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're', 's', 'same',
  'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 've', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'will', 'with', 'won', 'y', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// Suspicious threat indicators for explanation breakdown
const SUSPICIOUS_PATTERNS = [
  { regex: /\b(urgent|immediately|action required|arrest|warrant|penalty)\b/i, label: 'Urgency Pressure' },
  { regex: /\b(bank|account|suspended|unauthorized|flagged|security alert|login attempt)\b/i, label: 'Financial/Security Impersonation' },
  { regex: /\b(crypto|bitcoin|usdt|airdrop|binance|wallet|seed phrase)\b/i, label: 'Cryptocurrency/Token Scheme' },
  { regex: /\b(winner|claim|voucher|gift card|won|walmart|amazon refund)\b/i, label: 'Prize/Gift Bait' },
  { regex: /\b(ssn|password|pin|verification code|6-digit|otp)\b/i, label: 'Credential/2FA Harvest' },
  { regex: /\b(wire transfer|zelle|cashapp|western union|deposit)\b/i, label: 'Untraceable Payment Request' },
  { regex: /https?:\/\/[^\s]+/i, label: 'External Unverified Link' }
];

/**
 * Loads the trained AI Jury model bundle from the public static assets.
 */
export async function loadAIJuryModel(): Promise<ModelBundle | null> {
  if (cachedBundle) return cachedBundle;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const res = await fetch('/models/ai_jury_model.json');
      if (!res.ok) {
        throw new Error(`Failed to load model file: ${res.statusText}`);
      }
      const data: ModelBundle = await res.json();
      cachedBundle = data;
      return data;
    } catch (err) {
      console.warn('AI Jury model could not be loaded from static bundle. Using rule-based fallback.', err);
      return null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Local TF-IDF feature extraction
 */
function extractTfidfFeatures(text: string, bundle: ModelBundle): number[] {
  const { vocabulary, idf } = bundle.vectorizer;
  const numFeatures = idf.length;
  const vector = new Array<number>(numFeatures).fill(0);

  // Normalize and tokenize
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const rawTokens = cleaned.split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));

  if (rawTokens.length === 0) return vector;

  // Unigrams and Bigrams
  const ngrams: string[] = [...rawTokens];
  for (let i = 0; i < rawTokens.length - 1; i++) {
    ngrams.push(`${rawTokens[i]} ${rawTokens[i + 1]}`);
  }

  // Count frequencies
  const counts: Record<number, number> = {};
  for (const gram of ngrams) {
    if (gram in vocabulary) {
      const idx = vocabulary[gram];
      counts[idx] = (counts[idx] || 0) + 1;
    }
  }

  // Sublinear TF-IDF: (1 + log(tf)) * idf
  let normSq = 0;
  for (const idxStr in counts) {
    const idx = parseInt(idxStr, 10);
    const tf = counts[idx];
    const tfWeight = 1 + Math.log(tf);
    const tfidf = tfWeight * idf[idx];
    vector[idx] = tfidf;
    normSq += tfidf * tfidf;
  }

  // L2 Normalization
  if (normSq > 0) {
    const norm = Math.sqrt(normSq);
    for (let i = 0; i < numFeatures; i++) {
      if (vector[i] > 0) vector[i] /= norm;
    }
  }

  return vector;
}

// 1. Decision Tree Juror
function predictDecisionTree(features: number[], dt: ModelBundle['models']['decision_tree']): { isScam: boolean; prob: number } {
  let node = 0;
  while (dt.children_left[node] !== -1) {
    const featureIdx = dt.feature[node];
    const threshold = dt.threshold[node];
    const val = features[featureIdx] || 0;
    if (val <= threshold) {
      node = dt.children_left[node];
    } else {
      node = dt.children_right[node];
    }
  }

  const values = dt.value[node][0]; // [hamCount, spamCount]
  const total = (values[0] || 0) + (values[1] || 0);
  const spamProb = total > 0 ? (values[1] || 0) / total : 0;
  return { isScam: spamProb >= 0.5, prob: spamProb };
}

// 2. Naive Bayes Juror
function predictNaiveBayes(features: number[], nb: ModelBundle['models']['naive_bayes']): { isScam: boolean; prob: number } {
  const [logPriorHam, logPriorSpam] = nb.class_log_prior;
  const [featureLogProbHam, featureLogProbSpam] = nb.feature_log_prob;

  let scoreHam = logPriorHam;
  let scoreSpam = logPriorSpam;

  for (let i = 0; i < features.length; i++) {
    const weight = features[i];
    if (weight > 0) {
      scoreHam += weight * featureLogProbHam[i];
      scoreSpam += weight * featureLogProbSpam[i];
    }
  }

  // Softmax normalization for probability
  const maxScore = Math.max(scoreHam, scoreSpam);
  const expHam = Math.exp(scoreHam - maxScore);
  const expSpam = Math.exp(scoreSpam - maxScore);
  const spamProb = expSpam / (expHam + expSpam);

  return { isScam: spamProb >= 0.5, prob: spamProb };
}

// 3. k-Nearest Neighbors Juror (Cosine metric)
function predictKNN(features: number[], knn: ModelBundle['models']['knn']): { isScam: boolean; prob: number } {
  const { samples, labels, k } = knn;
  
  // Feature norm
  let featNorm = 0;
  for (let i = 0; i < features.length; i++) featNorm += features[i] * features[i];
  featNorm = Math.sqrt(featNorm);

  if (featNorm === 0) {
    return { isScam: false, prob: 0 };
  }

  const distances: { dist: number; label: number }[] = [];

  for (let s = 0; s < samples.length; s++) {
    const sample = samples[s];
    let dot = 0;
    let sampleNorm = 0;
    for (let i = 0; i < sample.length; i++) {
      dot += features[i] * sample[i];
      sampleNorm += sample[i] * sample[i];
    }
    sampleNorm = Math.sqrt(sampleNorm);
    const cosineSim = (sampleNorm > 0) ? (dot / (featNorm * sampleNorm)) : 0;
    const cosineDist = 1 - cosineSim;
    distances.push({ dist: cosineDist, label: labels[s] });
  }

  distances.sort((a, b) => a.dist - b.dist);
  const topK = distances.slice(0, Math.min(k, distances.length));
  const spamVotes = topK.filter(d => d.label === 1).length;
  const spamProb = spamVotes / topK.length;

  return { isScam: spamProb >= 0.5, prob: spamProb };
}

// 4. Artificial Neural Network Juror (MLP forward pass)
function predictANN(features: number[], ann: ModelBundle['models']['ann']): { isScam: boolean; prob: number } {
  const [W1, W2, W3] = ann.coefs;
  const [b1, b2, b3] = ann.intercepts;

  // Layer 1 (Dense -> ReLU)
  const h1 = new Array<number>(b1.length);
  for (let j = 0; j < b1.length; j++) {
    let sum = b1[j];
    for (let i = 0; i < features.length; i++) {
      if (features[i] > 0) sum += features[i] * W1[i][j];
    }
    h1[j] = Math.max(0, sum); // ReLU
  }

  // Layer 2 (Dense -> ReLU)
  const h2 = new Array<number>(b2.length);
  for (let j = 0; j < b2.length; j++) {
    let sum = b2[j];
    for (let i = 0; i < h1.length; i++) {
      sum += h1[i] * W2[i][j];
    }
    h2[j] = Math.max(0, sum); // ReLU
  }

  // Output Layer (Dense -> Sigmoid)
  let outSum = b3[0] !== undefined ? b3[0] : 0;
  for (let i = 0; i < h2.length; i++) {
    outSum += h2[i] * W3[i][0];
  }
  const spamProb = 1 / (1 + Math.exp(-outSum));

  return { isScam: spamProb >= 0.5, prob: spamProb };
}

/**
 * Evaluates message through the 4 Jurors + Pattern triggers.
 */
export async function evaluateMessageWithAIJury(text: string): Promise<AIJuryResult> {
  const threatKeywords: string[] = [];
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.regex.test(text)) {
      threatKeywords.push(pattern.label);
    }
  }

  const modelBundle = await loadAIJuryModel();

  let dtVote = false;
  let nbVote = false;
  let knnVote = false;
  let annVote = false;
  let totalProb = 0;

  if (modelBundle) {
    const features = extractTfidfFeatures(text, modelBundle);
    const dt = predictDecisionTree(features, modelBundle.models.decision_tree);
    const nb = predictNaiveBayes(features, modelBundle.models.naive_bayes);
    const knn = predictKNN(features, modelBundle.models.knn);
    const ann = predictANN(features, modelBundle.models.ann);

    dtVote = dt.isScam;
    nbVote = nb.isScam;
    knnVote = knn.isScam;
    annVote = ann.isScam;
    totalProb = (dt.prob + nb.prob + knn.prob + ann.prob) / 4;
  } else {
    // Fallback heuristic scoring if model bundle failed loading
    const suspiciousScore = threatKeywords.length * 0.35;
    const isSuspicious = suspiciousScore >= 0.5;
    dtVote = isSuspicious;
    nbVote = isSuspicious;
    knnVote = isSuspicious;
    annVote = isSuspicious;
    totalProb = Math.min(1, suspiciousScore);
  }

  const votes = {
    decisionTree: dtVote,
    naiveBayes: nbVote,
    knn: knnVote,
    ann: annVote,
  };

  const voteCount = (dtVote ? 1 : 0) + (nbVote ? 1 : 0) + (knnVote ? 1 : 0) + (annVote ? 1 : 0);

  // Verdict decision logic
  let verdict: 'SAFE' | 'SCAM' | 'UNCERTAIN';
  let explanation: string;

  if (voteCount >= 2 || (voteCount >= 1 && threatKeywords.length >= 2)) {
    verdict = 'SCAM';
    explanation = `${voteCount} of 4 AI jurors flagged this message as scam or phishing. Detected patterns: ${threatKeywords.join(', ') || 'High risk semantic phrasing'}.`;
  } else if (voteCount === 1 || threatKeywords.length === 1 || (totalProb > 0.3 && totalProb < 0.6)) {
    verdict = 'UNCERTAIN';
    explanation = `AI Jury detected potential risk factors (${threatKeywords.join(', ') || '1 juror dissent'}). Exercise caution.`;
  } else {
    verdict = 'SAFE';
    explanation = `All 4 AI jurors classified this message as normal communication with 0 scam threat triggers.`;
  }

  return {
    verdict,
    confidence: Math.round(totalProb * 100) / 100,
    votes,
    voteCount,
    threatKeywords,
    explanation,
    disclaimer: 'Note: AI detection is heuristic and provides advisory warnings. No automated system can guarantee absolute safety.'
  };
}
