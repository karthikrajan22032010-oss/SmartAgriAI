// ============================================================
// ALERT SERVICE — Generates, stores, and retrieves alerts
// ============================================================

import { PrismaClient } from '@prisma/client';
import { SensorData, AlertPayload } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// In-memory alert cache for fast access when DB is unavailable
const inMemoryAlerts: Array<AlertPayload & { id: string; timestamp: string; resolved: boolean }> = [];
let dbAvailable = true;

/**
 * Analyze sensor data and generate appropriate alerts.
 */
export async function analyzeAndAlert(data: SensorData): Promise<void> {
  const alerts: AlertPayload[] = [];

  // ── Very dry soil ─────────────────────────────────────────
  if (data.soilAverage !== null && data.soilAverage < 20) {
    alerts.push({
      type: 'VERY_DRY_SOIL',
      severity: 'CRITICAL',
      message: `Soil moisture critically low: ${data.soilAverage.toFixed(1)}%`,
    });
  } else if (data.soilAverage !== null && data.soilAverage < config.soilPumpOnThreshold) {
    alerts.push({
      type: 'VERY_DRY_SOIL',
      severity: 'WARNING',
      message: `Soil moisture low: ${data.soilAverage.toFixed(1)}% — irrigation recommended`,
    });
  }

  // ── Water level ───────────────────────────────────────────
  if (data.waterLevel !== null && data.waterLevel < config.waterLevelCritical) {
    alerts.push({
      type: 'CRITICAL_WATER',
      severity: 'CRITICAL',
      message: `Water level critically low: ${data.waterLevel.toFixed(1)}% — pump disabled`,
    });
  } else if (data.waterLevel !== null && data.waterLevel < config.waterLevelMinSafe) {
    alerts.push({
      type: 'LOW_WATER',
      severity: 'WARNING',
      message: `Water level low: ${data.waterLevel.toFixed(1)}%`,
    });
  }

  // ── High temperature ──────────────────────────────────────
  if (data.temperature !== null && data.temperature > config.tempHigh) {
    alerts.push({
      type: 'HIGH_TEMPERATURE',
      severity: 'CRITICAL',
      message: `High temperature: ${data.temperature.toFixed(1)}°C — check crop conditions`,
    });
  } else if (data.temperature !== null && data.temperature > config.tempWarning) {
    alerts.push({
      type: 'HIGH_TEMPERATURE',
      severity: 'WARNING',
      message: `Temperature warning: ${data.temperature.toFixed(1)}°C`,
    });
  }

  // ── Humidity ──────────────────────────────────────────────
  if (data.humidity !== null && data.humidity > config.humidityHigh) {
    alerts.push({
      type: 'HIGH_HUMIDITY',
      severity: 'WARNING',
      message: `High humidity: ${data.humidity.toFixed(1)}%`,
    });
  } else if (data.humidity !== null && data.humidity < config.humidityLow) {
    alerts.push({
      type: 'LOW_HUMIDITY',
      severity: 'INFO',
      message: `Low humidity: ${data.humidity.toFixed(1)}%`,
    });
  }

  // ── Persist alerts to DB ──────────────────────────────────
  for (const alert of alerts) {
    await createAlert(alert);
  }
}

/**
 * Create a new alert in the database.
 */
export async function createAlert(payload: AlertPayload): Promise<void> {
  try {
    await prisma.alert.create({
      data: {
        type: payload.type as any,
        severity: payload.severity as any,
        message: payload.message,
        language: payload.language || 'en',
      },
    });
    dbAvailable = true;
    logger.info(`Alert created: [${payload.severity}] ${payload.type} — ${payload.message}`);
  } catch (err) {
    dbAvailable = false;
    logger.error('Failed to save alert to DB, using in-memory cache', {
      error: (err as Error).message,
    });
    inMemoryAlerts.push({
      ...payload,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }
}

/**
 * Get recent unresolved alerts.
 */
export async function getAlerts(limit = 50) {
  try {
    const alerts = await prisma.alert.findMany({
      where: { resolved: false },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    dbAvailable = true;
    return alerts;
  } catch {
    dbAvailable = false;
    return inMemoryAlerts.slice(-limit).reverse();
  }
}

/**
 * Resolve an alert by ID.
 */
export async function resolveAlert(id: string): Promise<boolean> {
  try {
    await prisma.alert.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
    return true;
  } catch (err) {
    logger.error('Failed to resolve alert', { id, error: (err as Error).message });
    const idx = inMemoryAlerts.findIndex((a) => a.id === id);
    if (idx >= 0) { inMemoryAlerts[idx].resolved = true; return true; }
    return false;
  }
}

export function isDbAvailable(): boolean {
  return dbAvailable;
}
