/**
 * SafeChat Continuous Keystroke Dynamics Engine
 * 
 * - Enrollment Phase: Analyzes typing cadence across the first 10 sent messages
 * - Verification Phase: Compares subsequent messages against the established 10-message baseline
 * - Extracts temporal behavioral biometrics (Dwell Time and Flight Time)
 * - Zero raw key transmission — 100% client-side privacy preservation
 */

import type { KeystrokeMetrics, KeystrokeRiskReport, KeystrokeTiming } from './types';

const PROFILE_STORAGE_KEY_PREFIX = 'safechat_keystroke_profile_';
const OPT_IN_STORAGE_KEY_PREFIX = 'safechat_keystroke_optin_';
const REQUIRED_CALIBRATION_MESSAGES = 10;

export class KeystrokeCollector {
  private keyPressMap: Map<string, number> = new Map();
  private lastKeyUpTime: number = 0;
  private currentTimings: KeystrokeTiming[] = [];
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  public setUserId(userId: string) {
    this.userId = userId;
  }

  public isOptedIn(): boolean {
    const val = localStorage.getItem(`${OPT_IN_STORAGE_KEY_PREFIX}${this.userId}`);
    return val !== 'false'; // Enabled by default for continuous authentication
  }

  public setOptIn(enabled: boolean): void {
    localStorage.setItem(`${OPT_IN_STORAGE_KEY_PREFIX}${this.userId}`, enabled ? 'true' : 'false');
    if (!enabled) {
      this.clearCurrentBuffer();
    }
  }

  public handleKeyDown(event: React.KeyboardEvent | KeyboardEvent): void {
    if (!this.isOptedIn()) return;
    const now = performance.now();
    const code = event.code;

    // Ignore repeating keys
    if (this.keyPressMap.has(code)) return;
    this.keyPressMap.set(code, now);
  }

  public handleKeyUp(event: React.KeyboardEvent | KeyboardEvent): void {
    if (!this.isOptedIn()) return;
    const now = performance.now();
    const code = event.code;
    const keyDownTime = this.keyPressMap.get(code);

    if (keyDownTime !== undefined) {
      const dwellTime = Math.max(10, Math.min(1000, now - keyDownTime));
      let flightTime = 0;
      if (this.lastKeyUpTime > 0) {
        flightTime = Math.max(0, Math.min(3000, keyDownTime - this.lastKeyUpTime));
      }

      this.currentTimings.push({
        key: 'ANONYMIZED',
        keyDownTime,
        keyUpTime: now,
        dwellTime,
        flightTime,
      });

      this.lastKeyUpTime = now;
      this.keyPressMap.delete(code);
    }
  }

  public clearCurrentBuffer(): void {
    this.currentTimings = [];
    this.keyPressMap.clear();
    this.lastKeyUpTime = 0;
  }

  public getProfile(): KeystrokeMetrics | null {
    const raw = localStorage.getItem(`${PROFILE_STORAGE_KEY_PREFIX}${this.userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public resetProfile(): void {
    localStorage.removeItem(`${PROFILE_STORAGE_KEY_PREFIX}${this.userId}`);
    this.clearCurrentBuffer();
  }

  /**
   * Evaluates active typing cadence in real-time as the user types.
   */
  public analyzeAndEvaluate(): KeystrokeRiskReport {
    if (!this.isOptedIn()) {
      return {
        status: 'opted_out',
        anomalyScore: 0,
        dwellDeviationZ: 0,
        flightDeviationZ: 0,
        isRiskAlert: false,
        sampleCount: 0,
        enrolledMessageCount: 0,
        isCalibrated: false,
      };
    }

    const samples = this.currentTimings;
    const profile = this.getProfile();
    const enrolledCount = profile?.enrolledMessageCount || 0;
    const isCalibrated = Boolean(profile?.isCalibrated && enrolledCount >= REQUIRED_CALIBRATION_MESSAGES);

    // If still in the 10-message calibration phase
    if (!isCalibrated) {
      return {
        status: 'learning',
        anomalyScore: 0,
        dwellDeviationZ: 0,
        flightDeviationZ: 0,
        isRiskAlert: false,
        sampleCount: samples.length,
        enrolledMessageCount: enrolledCount,
        isCalibrated: false,
      };
    }

    // Baseline is calibrated (>= 10 messages): Compare active message's typing rhythm!
    if (samples.length < 3) {
      return {
        status: 'normal',
        anomalyScore: 0.05,
        dwellDeviationZ: 0,
        flightDeviationZ: 0,
        isRiskAlert: false,
        sampleCount: samples.length,
        enrolledMessageCount: enrolledCount,
        isCalibrated: true,
      };
    }

    const dwells = samples.map(s => s.dwellTime);
    const flights = samples.filter(s => s.flightTime > 0).map(s => s.flightTime);

    const sampleDwellMean = dwells.reduce((a, b) => a + b, 0) / dwells.length;
    const sampleFlightMean = flights.length > 0 ? flights.reduce((a, b) => a + b, 0) / flights.length : profile!.flightMean;

    const dwellStd = Math.max(12, profile!.dwellStd);
    const flightStd = Math.max(20, profile!.flightStd);

    const dwellZ = Math.abs(sampleDwellMean - profile!.dwellMean) / dwellStd;
    const flightZ = Math.abs(sampleFlightMean - profile!.flightMean) / flightStd;

    const combinedZ = (dwellZ * 0.5) + (flightZ * 0.5);
    const anomalyScore = Math.min(1.0, Math.max(0.0, Math.max(dwellZ, flightZ, combinedZ) / 2.5));

    // Anomaly threshold: Trigger if typing speed (flight) or key hold (dwell) is unusually slow/fast (> 1.7σ)
    const isRiskAlert = samples.length >= 4 && (dwellZ > 1.7 || flightZ > 1.7 || combinedZ > 1.5 || anomalyScore > 0.5);

    return {
      status: isRiskAlert ? 'anomaly' : 'normal',
      anomalyScore: Math.round(anomalyScore * 100) / 100,
      dwellDeviationZ: Math.round(dwellZ * 100) / 100,
      flightDeviationZ: Math.round(flightZ * 100) / 100,
      isRiskAlert,
      sampleCount: samples.length,
      enrolledMessageCount: enrolledCount,
      isCalibrated: true,
    };
  }

  /**
   * Commits the sent message's keystroke samples into the baseline profile.
   * Called when a message is successfully sent.
   */
  public commitMessageBaseline(): { enrolledCount: number; isNowCalibrated: boolean } {
    const samples = this.currentTimings;
    const existing = this.getProfile();
    let currentEnrolled = existing?.enrolledMessageCount || 0;

    // Only learn during the first 10 messages, and only if user typed at least 2 keystrokes
    if (currentEnrolled < REQUIRED_CALIBRATION_MESSAGES && samples.length >= 2) {
      const dwells = samples.map(s => s.dwellTime);
      const flights = samples.filter(s => s.flightTime > 0).map(s => s.flightTime);

      const msgDwellMean = dwells.reduce((a, b) => a + b, 0) / dwells.length;
      const msgDwellVar = dwells.reduce((a, b) => a + Math.pow(b - msgDwellMean, 2), 0) / dwells.length;
      const msgDwellStd = Math.max(12, Math.sqrt(msgDwellVar));

      const msgFlightMean = flights.length > 0 ? flights.reduce((a, b) => a + b, 0) / flights.length : 140;
      const msgFlightVar = flights.length > 0 ? flights.reduce((a, b) => a + Math.pow(b - msgFlightMean, 2), 0) / flights.length : 350;
      const msgFlightStd = Math.max(20, Math.sqrt(msgFlightVar));

      currentEnrolled += 1;
      const isNowCalibrated = currentEnrolled >= REQUIRED_CALIBRATION_MESSAGES;

      if (!existing) {
        const initialProfile: KeystrokeMetrics = {
          dwellMean: Math.round(msgDwellMean),
          dwellStd: Math.round(msgDwellStd),
          flightMean: Math.round(msgFlightMean),
          flightStd: Math.round(msgFlightStd),
          typingSpeedCpm: Math.round(60000 / Math.max(1, msgFlightMean + msgDwellMean)),
          totalKeystrokes: dwells.length,
          enrolledMessageCount: currentEnrolled,
          isCalibrated: isNowCalibrated,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}${this.userId}`, JSON.stringify(initialProfile));
      } else {
        // Weighted average across calibration messages
        const weight = 1 / currentEnrolled;
        const updatedProfile: KeystrokeMetrics = {
          dwellMean: Math.round((1 - weight) * existing.dwellMean + weight * msgDwellMean),
          dwellStd: Math.round((1 - weight) * existing.dwellStd + weight * msgDwellStd),
          flightMean: Math.round((1 - weight) * existing.flightMean + weight * msgFlightMean),
          flightStd: Math.round((1 - weight) * existing.flightStd + weight * msgFlightStd),
          typingSpeedCpm: Math.round((1 - weight) * existing.typingSpeedCpm + weight * (60000 / Math.max(1, msgFlightMean + msgDwellMean))),
          totalKeystrokes: existing.totalKeystrokes + dwells.length,
          enrolledMessageCount: currentEnrolled,
          isCalibrated: isNowCalibrated,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}${this.userId}`, JSON.stringify(updatedProfile));
      }

      this.clearCurrentBuffer();
      return { enrolledCount: currentEnrolled, isNowCalibrated };
    }

    this.clearCurrentBuffer();
    return {
      enrolledCount: currentEnrolled,
      isNowCalibrated: currentEnrolled >= REQUIRED_CALIBRATION_MESSAGES,
    };
  }
}
