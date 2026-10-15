export type RiskLevel = 'safe' | 'uncertain' | 'scam';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  username?: string;
  avatar_url?: string | null;
  public_key?: string | null;
  face_enrolled?: boolean;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at?: string;
  profile?: Profile;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Profile[];
  last_message?: DecryptedMessage;
  unread_count?: number;
  is_group?: boolean;
  group_name?: string;
}

export interface RawMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string; // Base64 AES-GCM ciphertext
  iv: string;                // Base64 IV
  key_distribution: Record<string, string>; // { [userId]: base64EncryptedAesKey }
  risk_level?: RiskLevel;
  status: MessageStatus;
  created_at: string;
}

export interface AIJuryResult {
  verdict: 'SAFE' | 'SCAM' | 'UNCERTAIN';
  confidence: number;
  votes: {
    decisionTree: boolean;
    naiveBayes: boolean;
    knn: boolean;
    ann: boolean;
  };
  voteCount: number;
  threatKeywords: string[];
  explanation: string;
  disclaimer: string;
}

export type MessageType = 'text' | 'voice' | 'file' | 'image';

export interface FileMetadata {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string;
  duration?: number;
}

export interface DecryptedMessage extends RawMessage {
  decryptedText: string;
  isDecrypted: boolean;
  messageType?: MessageType;
  fileMetadata?: FileMetadata;
  juryResult?: AIJuryResult;
  keystrokeAnomaly?: boolean;
}

export interface KeystrokeTiming {
  key: string;
  keyDownTime: number;
  keyUpTime: number;
  dwellTime: number;
  flightTime: number; // latency from previous key release
}

export interface KeystrokeMetrics {
  dwellMean: number;
  dwellStd: number;
  flightMean: number;
  flightStd: number;
  typingSpeedCpm: number;
  totalKeystrokes: number;
  enrolledMessageCount: number; // Count of messages used to build baseline (up to 10)
  isCalibrated: boolean;        // True once 10 messages are recorded
  lastUpdated: number;
}

export interface KeystrokeRiskReport {
  status: 'calibrated' | 'learning' | 'anomaly' | 'normal' | 'opted_out';
  anomalyScore: number; // 0 to 1, higher is riskier
  dwellDeviationZ: number;
  flightDeviationZ: number;
  isRiskAlert: boolean;
  sampleCount: number;
  baselineKeystrokes?: number;
  enrolledMessageCount: number;
  isCalibrated: boolean;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'rejected' | 'verified' | 'failed';
export type LivenessChallengeType = 'blink' | 'turn_left' | 'turn_right' | 'nod_down';

export interface VerificationAttestation {
  challengeId: string;
  livenessToken: string;
  timestamp: number;
  challengeType: LivenessChallengeType;
  livenessConfirmed: boolean;
  similarityScore: number;
  faceDetectedCount: number;
  attestationDigest: string;
}

export interface VerificationChallenge {
  id: string;
  conversation_id: string;
  requester_id: string;
  target_id: string;
  reason: string;
  status: ChallengeStatus;
  liveness_token?: string;
  match_accuracy?: number;
  created_at: string;
  updated_at?: string;
}

export interface FaceBiometricProfile {
  enrolled: boolean;
  enrolledAt?: string;
  templateVector: number[]; // Normalized facial landmark descriptor vector
  facialFeatures?: {
    eyeDistanceRatio: number;
    jawWidthRatio: number;
    noseLengthRatio: number;
  };
}

export interface KeyPairBundle {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  publicKeyBase64: string;
  fingerprint: string;
}
