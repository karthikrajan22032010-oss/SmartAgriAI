// ============================================================
// IRRIGATION SERVICE — Automatic irrigation logic with hysteresis
// This is the safety-critical control layer.
// AI recommendations CANNOT override these rules.
// ============================================================

import { config } from '../config';
import { SensorData, IrrigationDecision } from '../types';
import { logger } from '../utils/logger';

// ── Hysteresis State ─────────────────────────────────────────
// Tracks current pump state to implement ON/OFF thresholds
let currentPumpState = false;

/**
 * Evaluate whether the pump should be ON or OFF.
 *
 * Rules (in priority order):
 *   1. If waterLevel < waterLevelMinSafe → pump MUST be OFF
 *   2. If soilAverage < soilPumpOnThreshold AND water is safe → pump ON
 *   3. If soilAverage >= soilPumpOffThreshold → pump OFF
 *   4. Otherwise → maintain current state (hysteresis)
 */
export function evaluateIrrigation(data: SensorData): IrrigationDecision {
  const soil = data.soilAverage;
  const water = data.waterLevel;

  // ── Water safety check (HIGHEST PRIORITY) ────────────────
  if (water !== null && water < config.waterLevelMinSafe) {
    currentPumpState = false;
    const reason =
      water < config.waterLevelCritical
        ? 'CRITICAL: Water level critically low — pump disabled'
        : 'SAFETY: Water level below minimum safe threshold — pump disabled';
    logger.warn(reason, { waterLevel: water });
    return { shouldPump: false, reason, waterSafe: false };
  }

  // ── Soil is null / sensor failure ────────────────────────
  if (soil === null) {
    logger.warn('Soil sensor failure — pump remains in current state');
    return {
      shouldPump: currentPumpState,
      reason: 'Soil sensor failure — maintaining current state',
      waterSafe: true,
    };
  }

  // ── Pump ON condition: soil < threshold AND water safe ────
  if (soil < config.soilPumpOnThreshold) {
    currentPumpState = true;
    const reason = `Soil moisture ${soil.toFixed(1)}% is below ${config.soilPumpOnThreshold}% threshold — irrigation started`;
    logger.info(reason);
    return { shouldPump: true, reason, waterSafe: true };
  }

  // ── Pump OFF condition: soil >= off threshold ─────────────
  if (soil >= config.soilPumpOffThreshold) {
    currentPumpState = false;
    const reason = `Soil moisture ${soil.toFixed(1)}% reached ${config.soilPumpOffThreshold}% — irrigation stopped`;
    logger.info(reason);
    return { shouldPump: false, reason, waterSafe: true };
  }

  // ── Hysteresis zone: maintain current state ───────────────
  const reason = `Soil moisture ${soil.toFixed(1)}% in hysteresis zone — maintaining current state (pump ${currentPumpState ? 'ON' : 'OFF'})`;
  return { shouldPump: currentPumpState, reason, waterSafe: true };
}

/**
 * Classify soil moisture percentage into human-readable status.
 */
export function classifySoil(pct: number | null): string {
  if (pct === null) return 'UNKNOWN';
  if (pct < 30) return 'VERY_DRY';
  if (pct < 60) return 'MODERATE';
  return 'WET';
}

/**
 * Classify temperature.
 */
export function classifyTemperature(temp: number | null): string {
  if (temp === null) return 'UNKNOWN';
  if (temp >= config.tempHigh) return 'HIGH';
  if (temp >= config.tempWarning) return 'WARNING';
  return 'NORMAL';
}

/**
 * Classify humidity.
 */
export function classifyHumidity(hum: number | null): string {
  if (hum === null) return 'UNKNOWN';
  if (hum < config.humidityLow) return 'LOW';
  if (hum > config.humidityHigh) return 'HIGH';
  return 'NORMAL';
}

/**
 * Classify water level.
 */
export function classifyWaterLevel(wl: number | null): string {
  if (wl === null) return 'UNKNOWN';
  if (wl < config.waterLevelCritical) return 'CRITICAL';
  if (wl < config.waterLevelMinSafe) return 'LOW';
  return 'SAFE';
}

/**
 * Classify light level from raw LDR ADC value.
 */
export function classifyLight(ldr: number | null): string {
  if (ldr === null) return 'UNKNOWN';
  if (ldr < config.ldrDark) return 'DARK';
  if (ldr > config.ldrBright) return 'BRIGHT';
  return 'NORMAL';
}

export function setPumpState(state: boolean) {
  currentPumpState = state;
}

export function getPumpState(): boolean {
  return currentPumpState;
}
