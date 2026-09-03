// ============================================================
// BACKEND TESTS — Irrigation logic, sensor classification, safety
// ============================================================

import {
  evaluateIrrigation,
  classifySoil,
  classifyTemperature,
  classifyHumidity,
  classifyWaterLevel,
  classifyLight,
  setPumpState,
} from '../services/irrigationService';
import { SensorData } from '../types';

function makeSensor(overrides: Partial<SensorData> = {}): SensorData {
  return {
    soil1: 50,
    soil2: 50,
    soilAverage: 50,
    temperature: 25,
    humidity: 60,
    light: 400,
    waterLevel: 70,
    pump: false,
    mode: 'AUTO',
    ...overrides,
  };
}

// ── Soil Classification ──────────────────────────────────
describe('classifySoil', () => {
  it('returns VERY_DRY for < 30%', () => {
    expect(classifySoil(0)).toBe('VERY_DRY');
    expect(classifySoil(29)).toBe('VERY_DRY');
  });

  it('returns MODERATE for 30–59%', () => {
    expect(classifySoil(30)).toBe('MODERATE');
    expect(classifySoil(59)).toBe('MODERATE');
  });

  it('returns WET for >= 60%', () => {
    expect(classifySoil(60)).toBe('WET');
    expect(classifySoil(100)).toBe('WET');
  });

  it('returns UNKNOWN for null', () => {
    expect(classifySoil(null)).toBe('UNKNOWN');
  });
});

// ── Temperature Classification ───────────────────────────
describe('classifyTemperature', () => {
  it('returns NORMAL for < 30°C', () => expect(classifyTemperature(25)).toBe('NORMAL'));
  it('returns WARNING for 30–35°C', () => expect(classifyTemperature(32)).toBe('WARNING'));
  it('returns HIGH for > 35°C', () => expect(classifyTemperature(38)).toBe('HIGH'));
  it('returns UNKNOWN for null', () => expect(classifyTemperature(null)).toBe('UNKNOWN'));
});

// ── Water Level Classification ───────────────────────────
describe('classifyWaterLevel', () => {
  it('returns CRITICAL for < 10%', () => expect(classifyWaterLevel(5)).toBe('CRITICAL'));
  it('returns LOW for 10–19%', () => expect(classifyWaterLevel(15)).toBe('LOW'));
  it('returns SAFE for >= 20%', () => expect(classifyWaterLevel(50)).toBe('SAFE'));
});

// ── Irrigation Logic ─────────────────────────────────────
describe('evaluateIrrigation', () => {
  beforeEach(() => setPumpState(false));

  it('turns pump ON when soil < 30% and water is safe', () => {
    const data = makeSensor({ soilAverage: 25, waterLevel: 70 });
    const result = evaluateIrrigation(data);
    expect(result.shouldPump).toBe(true);
    expect(result.waterSafe).toBe(true);
  });

  it('turns pump OFF when soil >= 60%', () => {
    setPumpState(true);
    const data = makeSensor({ soilAverage: 65, waterLevel: 70 });
    const result = evaluateIrrigation(data);
    expect(result.shouldPump).toBe(false);
  });

  it('SAFETY: blocks pump when water level is below minimum', () => {
    const data = makeSensor({ soilAverage: 10, waterLevel: 15 });
    const result = evaluateIrrigation(data);
    expect(result.shouldPump).toBe(false);
    expect(result.waterSafe).toBe(false);
  });

  it('SAFETY: blocks pump when water level is CRITICAL', () => {
    const data = makeSensor({ soilAverage: 5, waterLevel: 5 });
    const result = evaluateIrrigation(data);
    expect(result.shouldPump).toBe(false);
    expect(result.waterSafe).toBe(false);
  });

  it('hysteresis: maintains pump OFF in 30–59% zone', () => {
    setPumpState(false);
    const data = makeSensor({ soilAverage: 45, waterLevel: 70 });
    const result = evaluateIrrigation(data);
    expect(result.shouldPump).toBe(false);
  });

  it('hysteresis: maintains pump ON in 30–59% zone after being ON', () => {
    setPumpState(true);
    const data = makeSensor({ soilAverage: 45, waterLevel: 70 });
    const result = evaluateIrrigation(data);
    expect(result.shouldPump).toBe(true);
  });

  it('handles null soil sensor gracefully', () => {
    const data = makeSensor({ soilAverage: null });
    const result = evaluateIrrigation(data);
    // Should not throw, should return current state
    expect(typeof result.shouldPump).toBe('boolean');
  });
});

// ── Light Classification ─────────────────────────────────
describe('classifyLight', () => {
  it('returns DARK for < 200', () => expect(classifyLight(100)).toBe('DARK'));
  it('returns NORMAL for 200–700', () => expect(classifyLight(400)).toBe('NORMAL'));
  it('returns BRIGHT for > 700', () => expect(classifyLight(900)).toBe('BRIGHT'));
});
