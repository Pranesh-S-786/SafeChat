import { describe, it, expect, beforeEach } from 'vitest';
import { KeystrokeCollector } from '../src/lib/keystroke';

describe('Keystroke Dynamics Biometrics Engine', () => {
  const testUserId = 'test-keystroke-user-uuid';
  let collector: KeystrokeCollector;

  let currentTime = 1000;

  beforeEach(() => {
    localStorage.clear();
    currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
    collector = new KeystrokeCollector(testUserId);
    collector.resetProfile();
  });

  const simulateTyping = (
    c: KeystrokeCollector,
    keys: string[],
    dwellMs: number,
    flightMs: number
  ) => {
    for (let i = 0; i < keys.length; i++) {
      const code = `Key${keys[i].toUpperCase()}`;

      // KeyDown at current simulated time
      const downEvent = { code } as unknown as KeyboardEvent;
      c.handleKeyDown(downEvent);

      // Advance time by dwell duration
      currentTime += dwellMs;
      const upEvent = { code } as unknown as KeyboardEvent;
      c.handleKeyUp(upEvent);

      // Advance time by flight latency to next key
      currentTime += flightMs;
    }
  };

  it('enforces a strict 10-message calibration period before activating anomaly detection', () => {
    // Before any message
    let report = collector.analyzeAndEvaluate();
    expect(report.status).toBe('learning');
    expect(report.isCalibrated).toBe(false);
    expect(report.enrolledMessageCount).toBe(0);

    // Commit 9 messages
    for (let m = 1; m <= 9; m++) {
      simulateTyping(collector, ['h', 'e', 'l', 'l', 'o'], 80, 120);
      const res = collector.commitMessageBaseline();
      expect(res.enrolledCount).toBe(m);
      expect(res.isNowCalibrated).toBe(false);

      report = collector.analyzeAndEvaluate();
      expect(report.status).toBe('learning');
      expect(report.isCalibrated).toBe(false);
    }

    // Commit 10th message
    simulateTyping(collector, ['w', 'o', 'r', 'l', 'd'], 80, 120);
    const finalRes = collector.commitMessageBaseline();
    expect(finalRes.enrolledCount).toBe(10);
    expect(finalRes.isNowCalibrated).toBe(true);

    report = collector.analyzeAndEvaluate();
    expect(report.isCalibrated).toBe(true);
    expect(report.enrolledMessageCount).toBe(10);
  });

  it('classifies consistent typing cadence as normal after calibration', () => {
    // Calibrate with 10 messages with ~80ms dwell and ~120ms flight
    for (let m = 0; m < 10; m++) {
      simulateTyping(collector, ['t', 'e', 's', 't', 'i', 'n', 'g'], 80, 120);
      collector.commitMessageBaseline();
    }

    // Now type a new message with similar rhythm
    simulateTyping(collector, ['a', 'b', 'c', 'd', 'e'], 82, 125);
    const report = collector.analyzeAndEvaluate();

    expect(report.isCalibrated).toBe(true);
    expect(report.status).toBe('normal');
    expect(report.isRiskAlert).toBe(false);
    expect(report.dwellDeviationZ).toBeLessThan(1.7);
    expect(report.flightDeviationZ).toBeLessThan(1.7);
  });

  it('detects an anomaly when typing speed or hold duration deviates (> 1.7σ)', () => {
    // Calibrate with fast typing (dwell: 60ms, flight: 80ms)
    for (let m = 0; m < 10; m++) {
      simulateTyping(collector, ['s', 'a', 'f', 'e', 'c', 'h', 'a', 't'], 60, 80);
      collector.commitMessageBaseline();
    }

    // Simulate an impostor typing extremely slow (dwell: 350ms, flight: 650ms)
    simulateTyping(collector, ['u', 'n', 'a', 'u', 't', 'h', 'o', 'r', 'i', 'z', 'e', 'd'], 350, 650);
    const report = collector.analyzeAndEvaluate();

    expect(report.isCalibrated).toBe(true);
    expect(report.status).toBe('anomaly');
    expect(report.isRiskAlert).toBe(true);
    expect(report.anomalyScore).toBeGreaterThan(0.5);
  });

  it('resets behavioral baseline cleanly upon profile reset', () => {
    for (let m = 0; m < 10; m++) {
      simulateTyping(collector, ['a', 'b', 'c'], 80, 120);
      collector.commitMessageBaseline();
    }
    expect(collector.getProfile()?.isCalibrated).toBe(true);

    collector.resetProfile();
    expect(collector.getProfile()).toBeNull();

    const report = collector.analyzeAndEvaluate();
    expect(report.status).toBe('learning');
    expect(report.isCalibrated).toBe(false);
  });
});
