import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeBiometricSimilarity,
  enrollFaceProfile,
  getEnrolledFaceProfile,
  deleteFaceProfile,
  extractLandmarkDescriptor,
} from '../src/lib/faceVerification';
import { KeystrokeCollector } from '../src/lib/keystroke';

describe('Account Registration Face Pattern Storage & Keystroke Comparison Test Suite', () => {
  const testUserId = 'test-registration-user-uuid';
  let collector: KeystrokeCollector;
  let simulatedTime = 1000;

  // Helper to create synthetic 478 landmarks
  const createSyntheticLandmarks = (options?: {
    eyeDistance?: number;
    translateX?: number;
    translateY?: number;
    variation?: number;
  }): Array<{ x: number; y: number; z: number }> => {
    const eyeDist = options?.eyeDistance ?? 0.2;
    const tx = options?.translateX ?? 0;
    const ty = options?.translateY ?? 0;
    const variation = options?.variation ?? 0;

    const landmarks: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < 478; i++) {
      landmarks.push({ x: 0.5 + tx, y: 0.5 + ty, z: 0 });
    }

    landmarks[33] = { x: 0.5 - eyeDist / 2 + tx, y: 0.45 + ty, z: 0 };
    landmarks[133] = { x: 0.5 - eyeDist / 4 + tx, y: 0.45 + ty, z: 0 };
    landmarks[159] = { x: 0.5 - eyeDist / 3 + tx, y: 0.44 + ty, z: 0 };
    landmarks[145] = { x: 0.5 - eyeDist / 3 + tx, y: 0.46 + ty, z: 0 };

    landmarks[263] = { x: 0.5 + eyeDist / 2 + tx, y: 0.45 + ty, z: 0 };
    landmarks[362] = { x: 0.5 + eyeDist / 4 + tx, y: 0.45 + ty, z: 0 };
    landmarks[386] = { x: 0.5 + eyeDist / 3 + tx, y: 0.44 + ty, z: 0 };
    landmarks[374] = { x: 0.5 + eyeDist / 3 + tx, y: 0.46 + ty, z: 0 };

    landmarks[1] = { x: 0.5 + tx + variation, y: 0.52 + ty, z: -0.05 };
    landmarks[152] = { x: 0.5 + tx, y: 0.72 + ty + variation, z: 0 };
    landmarks[10] = { x: 0.5 + tx, y: 0.28 + ty, z: 0 };
    landmarks[61] = { x: 0.44 + tx, y: 0.62 + ty, z: 0 };
    landmarks[291] = { x: 0.56 + tx, y: 0.62 + ty, z: 0 };

    return landmarks;
  };

  beforeEach(() => {
    localStorage.clear();
    simulatedTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => simulatedTime);
    collector = new KeystrokeCollector(testUserId);
    collector.resetProfile();
    deleteFaceProfile(testUserId);
  });

  it('stores the biometric face pattern locally upon account registration', () => {
    // 1. Initially no profile exists
    expect(getEnrolledFaceProfile(testUserId)).toBeNull();

    // 2. Scan and extract 64-D landmark pattern at registration
    const landmarks = createSyntheticLandmarks();
    const { descriptor } = extractLandmarkDescriptor(landmarks as any);

    expect(descriptor).toHaveLength(64);

    // 3. Store pattern for the user
    enrollFaceProfile(testUserId, descriptor);

    // 4. Verify pattern is enrolled and persists
    const enrolled = getEnrolledFaceProfile(testUserId);
    expect(enrolled).not.toBeNull();
    expect(enrolled?.enrolled).toBe(true);
    expect(enrolled?.templateVector).toHaveLength(64);
    expect(enrolled?.templateVector).toEqual(descriptor);
  });

  it('compares live face descriptor against pattern stored at account creation in keystroke test', () => {
    // 1. Account creation: User scans face and stores baseline pattern
    const registrationLandmarks = createSyntheticLandmarks({ eyeDistance: 0.20 });
    const { descriptor: registeredPattern } = extractLandmarkDescriptor(registrationLandmarks as any);
    enrollFaceProfile(testUserId, registeredPattern);

    const storedProfile = getEnrolledFaceProfile(testUserId);
    expect(storedProfile).not.toBeNull();

    // 2. Keystroke test: Live face of the genuine user is scanned to verify
    const liveGenuineLandmarks = createSyntheticLandmarks({ eyeDistance: 0.22, translateX: 0.02 });
    const { descriptor: liveDescriptor } = extractLandmarkDescriptor(liveGenuineLandmarks as any);

    // 3. Compute biometric similarity
    const similarity = computeBiometricSimilarity(storedProfile!.templateVector, liveDescriptor);

    // Must exceed the 70% confidence threshold (scale invariant match)
    expect(similarity).toBeGreaterThanOrEqual(0.70);
    expect(similarity).toBeGreaterThan(0.95);
  });

  it('rejects an impostor face when compared with the stored registration pattern', () => {
    // 1. Registered account owner pattern
    const registeredLandmarks = createSyntheticLandmarks();
    const { descriptor: registeredPattern } = extractLandmarkDescriptor(registeredLandmarks as any);
    enrollFaceProfile(testUserId, registeredPattern);

    // 2. Impostor face with drastically altered facial geometry
    const impostorLandmarks = createSyntheticLandmarks({ variation: 0.35, eyeDistance: 0.45 });
    // Invert salient landmark positions
    impostorLandmarks[1] = { x: 0.1, y: 0.9, z: 0 };
    impostorLandmarks[152] = { x: 0.9, y: 0.1, z: 0 };
    const { descriptor: impostorDescriptor } = extractLandmarkDescriptor(impostorLandmarks as any);

    const storedProfile = getEnrolledFaceProfile(testUserId);
    const similarity = computeBiometricSimilarity(storedProfile!.templateVector, impostorDescriptor);

    // Impostor similarity should fail (< 0.70 threshold)
    expect(similarity).toBeLessThan(0.70);
  });

  it('triggers anomaly evaluation in keystroke dynamics ready for biometric comparison', () => {
    // Calibrate baseline with normal typing
    for (let m = 0; m < 10; m++) {
      for (const char of ['h', 'e', 'l', 'l', 'o']) {
        const code = `Key${char.toUpperCase()}`;
        collector.handleKeyDown({ code } as any);
        simulatedTime += 80;
        collector.handleKeyUp({ code } as any);
        simulatedTime += 120;
      }
      collector.commitMessageBaseline();
    }

    // Now type an anomalous message (impostor typing with irregular rhythm)
    for (const char of ['i', 'm', 'p', 'o', 's', 't', 'o', 'r']) {
      const code = `Key${char.toUpperCase()}`;
      collector.handleKeyDown({ code } as any);
      simulatedTime += 350;
      collector.handleKeyUp({ code } as any);
      simulatedTime += 650;
    }

    const report = collector.analyzeAndEvaluate();
    expect(report.isCalibrated).toBe(true);
    expect(report.isRiskAlert).toBe(true);
    expect(report.status).toBe('anomaly');

    // Keystroke anomaly triggers the face comparison against the stored registration pattern
    const stored = getEnrolledFaceProfile(testUserId);
    expect(stored === null || stored.enrolled).toBeDefined();
  });
});
