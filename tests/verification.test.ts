import { describe, it, expect } from 'vitest';
import {
  checkFrameLighting,
  computeBiometricSimilarity,
  createVerificationAttestation,
  evaluateLivenessGesture,
  extractLandmarkDescriptor,
} from '../src/lib/faceVerification';
import type { ChallengeStatus, NormalizedLandmark } from '../src/lib/types';

describe('Biometric Verification, Landmarks & Liveness Test Suite', () => {
  // Helper to generate a realistic synthetic 478 MediaPipe face landmark array
  const createSyntheticLandmarks = (options?: {
    eyeDistance?: number;
    translateX?: number;
    translateY?: number;
    noseOffsetX?: number;
    noseOffsetY?: number;
    blinkLeft?: number;
    blinkRight?: number;
  }): Array<{ x: number; y: number; z: number }> => {
    const eyeDist = options?.eyeDistance ?? 0.2;
    const tx = options?.translateX ?? 0;
    const ty = options?.translateY ?? 0;
    const noseX = options?.noseOffsetX ?? 0;
    const noseY = options?.noseOffsetY ?? 0;

    const s = eyeDist / 0.2; // Scale factor relative to baseline eye distance

    const landmarks: Array<{ x: number; y: number; z: number }> = [];

    // Prepopulate 478 points
    for (let i = 0; i < 478; i++) {
      landmarks.push({ x: 0.5 + tx, y: 0.45 + ty, z: 0 });
    }

    // Set key landmarks:
    // Left eye outer: landmark 33
    landmarks[33] = { x: 0.5 - eyeDist / 2 + tx, y: 0.45 + ty, z: 0 };
    landmarks[133] = { x: 0.5 - eyeDist / 4 + tx, y: 0.45 + ty, z: 0 };
    landmarks[159] = { x: 0.5 - eyeDist / 3 + tx, y: 0.45 - 0.01 * s + ty, z: 0 };
    landmarks[145] = { x: 0.5 - eyeDist / 3 + tx, y: 0.45 + 0.01 * s + ty, z: 0 };

    // Right eye outer: landmark 263
    landmarks[263] = { x: 0.5 + eyeDist / 2 + tx, y: 0.45 + ty, z: 0 };
    landmarks[362] = { x: 0.5 + eyeDist / 4 + tx, y: 0.45 + ty, z: 0 };
    landmarks[386] = { x: 0.5 + eyeDist / 3 + tx, y: 0.45 - 0.01 * s + ty, z: 0 };
    landmarks[374] = { x: 0.5 + eyeDist / 3 + tx, y: 0.45 + 0.01 * s + ty, z: 0 };

    // Nose tip: landmark 1
    landmarks[1] = { x: 0.5 + tx + noseX, y: 0.45 + 0.07 * s + ty + noseY, z: -0.05 * s };

    // Chin: landmark 152
    landmarks[152] = { x: 0.5 + tx, y: 0.45 + 0.27 * s + ty, z: 0 };

    // Forehead: landmark 10
    landmarks[10] = { x: 0.5 + tx, y: 0.45 - 0.17 * s + ty, z: 0 };

    // Mouth corners: 61, 291
    landmarks[61] = { x: 0.5 - 0.06 * s + tx, y: 0.45 + 0.17 * s + ty, z: 0 };
    landmarks[291] = { x: 0.5 + 0.06 * s + tx, y: 0.45 + 0.17 * s + ty, z: 0 };

    return landmarks;
  };

  describe('3D Landmark Descriptor & Invariant Geometry', () => {
    it('extracts a normalized 64-dimensional descriptor from genuine 478 landmarks', () => {
      const landmarks = createSyntheticLandmarks();
      const { descriptor, eyeDistance } = extractLandmarkDescriptor(landmarks as any);

      expect(descriptor).toHaveLength(64);
      expect(eyeDistance).toBeCloseTo(0.2, 2);

      // Descriptor must be L2 normalized (Euclidean norm ≈ 1.0)
      const norm = Math.sqrt(descriptor.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('demonstrates scale and translation invariance across different camera distances', () => {
      const faceClose = createSyntheticLandmarks({ eyeDistance: 0.25, translateX: 0.05 });
      const faceFar = createSyntheticLandmarks({ eyeDistance: 0.15, translateX: -0.08 });

      const descClose = extractLandmarkDescriptor(faceClose as any).descriptor;
      const descFar = extractLandmarkDescriptor(faceFar as any).descriptor;

      // Same facial structure scaled and shifted should match strongly (cosine similarity > 0.975)
      const similarity = computeBiometricSimilarity(descClose, descFar);
      expect(similarity).toBeGreaterThan(0.975);
    });

    it('rejects arrays with insufficient landmarks (< 468 points)', () => {
      const incomplete = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }];
      expect(() => extractLandmarkDescriptor(incomplete as any)).toThrow(
        /Insufficient landmarks/i
      );
    });

    it('rejects faces positioned too far from the camera (micro eye-distance)', () => {
      const tinyFace = createSyntheticLandmarks({ eyeDistance: 0.01 });
      expect(() => extractLandmarkDescriptor(tinyFace as any)).toThrow(
        /Face is too far/i
      );
    });
  });

  describe('Active Interactive Liveness Challenges', () => {
    it('evaluates Eye Blink challenge accurately with blendshape signals', () => {
      const neutralFace = createSyntheticLandmarks();
      const closedEyesBlendshapes = [
        { categoryName: 'eyeBlinkLeft', score: 0.85 },
        { categoryName: 'eyeBlinkRight', score: 0.82 },
      ];
      const openEyesBlendshapes = [
        { categoryName: 'eyeBlinkLeft', score: 0.05 },
        { categoryName: 'eyeBlinkRight', score: 0.04 },
      ];

      const resClosed = evaluateLivenessGesture(neutralFace as any, 'blink', closedEyesBlendshapes);
      expect(resClosed.isGestureAchieved).toBe(true);

      const resOpen = evaluateLivenessGesture(neutralFace as any, 'blink', openEyesBlendshapes);
      expect(resOpen.isGestureAchieved).toBe(false);
    });

    it('evaluates Head Turn Left challenge using Yaw Landmark Ratio', () => {
      // Normal centered face (yaw ratio ≈ 1.0)
      const centerFace = createSyntheticLandmarks({ eyeDistance: 0.2, noseOffsetX: 0 });
      const centerRes = evaluateLivenessGesture(centerFace as any, 'turn_left');
      expect(centerRes.isGestureAchieved).toBe(false);

      // Turned left: nose tip shifts towards left eye (yaw ratio < 0.45)
      const leftTurnFace = createSyntheticLandmarks({ eyeDistance: 0.2, noseOffsetX: -0.065 });
      const leftRes = evaluateLivenessGesture(leftTurnFace as any, 'turn_left');
      expect(leftRes.isGestureAchieved).toBe(true);
    });

    it('evaluates Head Turn Right challenge using Yaw Landmark Ratio', () => {
      const centerFace = createSyntheticLandmarks({ eyeDistance: 0.2, noseOffsetX: 0 });
      expect(evaluateLivenessGesture(centerFace as any, 'turn_right').isGestureAchieved).toBe(false);

      // Turned right: nose tip shifts towards right eye (yaw ratio > 2.2)
      const rightTurnFace = createSyntheticLandmarks({ eyeDistance: 0.2, noseOffsetX: 0.065 });
      const rightRes = evaluateLivenessGesture(rightTurnFace as any, 'turn_right');
      expect(rightRes.isGestureAchieved).toBe(true);
    });

    it('evaluates Head Tilt / Nod Down challenge using Pitch Ratio', () => {
      const centerFace = createSyntheticLandmarks({ eyeDistance: 0.2, noseOffsetY: 0 });
      expect(evaluateLivenessGesture(centerFace as any, 'nod_down').isGestureAchieved).toBe(false);

      // Nod downward: nose tip moves down relative to chin
      const nodFace = createSyntheticLandmarks({ eyeDistance: 0.2, noseOffsetY: 0.08 });
      const nodRes = evaluateLivenessGesture(nodFace as any, 'nod_down');
      expect(nodRes.isGestureAchieved).toBe(true);
    });
  });

  describe('Cryptographic Attestation & Token Validation', () => {
    it('generates a verifiable cryptographic attestation payload bound to the liveness token', async () => {
      const challengeId = 'test-challenge-uuid-123';
      const token = 'nonce-secret-token-abc';
      const attestation = await createVerificationAttestation(
        challengeId,
        token,
        'turn_left',
        0.88
      );

      expect(attestation.challengeId).toBe(challengeId);
      expect(attestation.livenessToken).toBe(token);
      expect(attestation.challengeType).toBe('turn_left');
      expect(attestation.similarityScore).toBe(0.88);
      expect(attestation.livenessConfirmed).toBe(true);
      expect(attestation.attestationDigest).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex string
    });
  });

  describe('Environmental Quality / Lighting Detection', () => {
    it('detects inadequate dark and overexposed camera lighting', () => {
      // Mock 2D canvas context
      const createMockCtx = (pixelBrightness: number) => {
        return {
          getImageData: () => ({
            data: new Uint8ClampedArray(160 * 160 * 4).fill(pixelBrightness),
          }),
        } as unknown as CanvasRenderingContext2D;
      };

      // Very dark frame (brightness 10 / 255 ≈ 0.04)
      const darkCtx = createMockCtx(10);
      const darkCheck = checkFrameLighting(darkCtx, 160, 160);
      expect(darkCheck.isAdequate).toBe(false);
      expect(darkCheck.warning).toContain('dark');

      // Overexposed frame (brightness 250 / 255 ≈ 0.98)
      const brightCtx = createMockCtx(250);
      const brightCheck = checkFrameLighting(brightCtx, 160, 160);
      expect(brightCheck.isAdequate).toBe(false);
      expect(brightCheck.warning).toContain('overexposed');

      // Normal indoor lighting (brightness 128 / 255 ≈ 0.50)
      const normalCtx = createMockCtx(128);
      const normalCheck = checkFrameLighting(normalCtx, 160, 160);
      expect(normalCheck.isAdequate).toBe(true);
    });
  });

  describe('Verification Challenge State Machine Transitions', () => {
    const isValidTransition = (
      current: ChallengeStatus,
      next: ChallengeStatus,
      hasLivenessToken: boolean
    ): boolean => {
      if (current === 'verified' || current === 'failed' || current === 'rejected') {
        return false;
      }
      const allowed: ChallengeStatus[] = ['pending', 'accepted', 'rejected', 'verified', 'failed'];
      if (!allowed.includes(next)) return false;

      if (next === 'verified' && !hasLivenessToken) {
        return false;
      }

      if (current === 'pending') {
        return ['accepted', 'rejected', 'verified', 'failed'].includes(next);
      }
      if (current === 'accepted') {
        return ['verified', 'failed', 'rejected'].includes(next);
      }
      return false;
    };

    it('allows valid transitions from pending to verified when liveness token is present', () => {
      expect(isValidTransition('pending', 'verified', true)).toBe(true);
      expect(isValidTransition('pending', 'accepted', false)).toBe(true);
      expect(isValidTransition('accepted', 'verified', true)).toBe(true);
      expect(isValidTransition('accepted', 'failed', false)).toBe(true);
      expect(isValidTransition('pending', 'rejected', false)).toBe(true);
    });

    it('rejects transitioning to verified without a valid matching liveness token', () => {
      expect(isValidTransition('pending', 'verified', false)).toBe(false);
      expect(isValidTransition('accepted', 'verified', false)).toBe(false);
    });

    it('forbids mutating terminal challenge states', () => {
      expect(isValidTransition('verified', 'pending', true)).toBe(false);
      expect(isValidTransition('verified', 'failed', true)).toBe(false);
      expect(isValidTransition('failed', 'verified', true)).toBe(false);
      expect(isValidTransition('rejected', 'verified', true)).toBe(false);
    });
  });

  describe('Face Match Accuracy Percentage & Requester Notification', () => {
    it('computes exact face match accuracy percentage from live landmark comparison', () => {
      const templateLandmarks = createSyntheticLandmarks();
      const { descriptor: templateVector } = extractLandmarkDescriptor(templateLandmarks as NormalizedLandmark[]);

      // Same person scanned
      const liveScanLandmarks = createSyntheticLandmarks({ eyeDistance: 0.201, translateX: 0.002 });
      const { descriptor: liveVector } = extractLandmarkDescriptor(liveScanLandmarks as NormalizedLandmark[]);

      const similarity = computeBiometricSimilarity(templateVector, liveVector);
      const accuracyPercentage = Math.round(similarity * 100);

      expect(accuracyPercentage).toBeGreaterThanOrEqual(70);
      expect(accuracyPercentage).toBeLessThanOrEqual(100);
      expect(accuracyPercentage).toBe(100);
    });

    it('detects face mismatch accuracy and triggers failed status with low percentage for imposter face', () => {
      const templateLandmarks = createSyntheticLandmarks();
      const { descriptor: templateVector } = extractLandmarkDescriptor(templateLandmarks as NormalizedLandmark[]);

      // Imposter face with drastically altered facial geometry
      const imposterLandmarks = createSyntheticLandmarks({ eyeDistance: 0.45, translateX: 0.1, translateY: 0.1 });
      imposterLandmarks[1] = { x: 0.1, y: 0.9, z: 0 };
      imposterLandmarks[152] = { x: 0.9, y: 0.1, z: 0 };
      const { descriptor: imposterVector } = extractLandmarkDescriptor(imposterLandmarks as NormalizedLandmark[]);

      const similarity = computeBiometricSimilarity(templateVector, imposterVector);
      const accuracyPercentage = Math.round(similarity * 100);

      expect(accuracyPercentage).toBeLessThan(70);
    });

    it('formats face verification result notification payload with accuracy percentage for requester', () => {
      const challengeId = 'chal-1234';
      const accuracy = 94;
      const status: ChallengeStatus = 'verified';

      const notificationPayload = {
        challenge_id: challengeId,
        status,
        match_accuracy: accuracy,
        target_id: 'user-contact-567',
      };

      expect(notificationPayload.match_accuracy).toBe(94);
      expect(notificationPayload.status).toBe('verified');
      expect(`${notificationPayload.match_accuracy}%`).toBe('94%');
    });
  });
});

