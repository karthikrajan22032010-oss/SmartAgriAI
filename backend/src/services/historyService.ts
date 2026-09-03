// ============================================================
// HISTORY SERVICE — Periodic sensor data recording
// Saves readings every 30 seconds (configurable via .env)
// ============================================================

import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { fetchSensorData } from './esp32Service';
import { analyzeAndAlert } from './alertService';
import { evaluateIrrigation } from './irrigationService';
import { logger } from '../utils/logger';
import { TimeRange } from '../types';

const prisma = new PrismaClient();
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let esp32DeviceId: string | null = null;

/**
 * Load ESP32 device ID from database.
 */
async function loadDeviceId(): Promise<void> {
  try {
    const device = await prisma.device.findFirst({
      where: { type: 'ESP32_MAIN' },
    });
    if (device) {
      esp32DeviceId = device.id;
      logger.info(`History service: ESP32 device ID = ${device.id}`);
    }
  } catch (err) {
    logger.error('History service: could not load device ID', { error: (err as Error).message });
  }
}

/**
 * Record one sensor reading snapshot.
 */
async function recordReading(): Promise<void> {
  if (!esp32DeviceId) return;

  try {
    const data = await fetchSensorData();
    const decision = evaluateIrrigation(data);

    await prisma.sensorReading.create({
      data: {
        soil1: data.soil1 ?? null,
        soil2: data.soil2 ?? null,
        soilAverage: data.soilAverage ?? null,
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        light: data.light ?? null,
        waterLevel: data.waterLevel ?? null,
        pumpState: decision.shouldPump,
        mode: data.mode,
        deviceId: esp32DeviceId,
      },
    });

    // Update device status
    await prisma.device.update({
      where: { id: esp32DeviceId },
      data: { status: 'ONLINE', lastSeen: new Date() },
    });

    // Analyze and generate alerts
    await analyzeAndAlert(data);

    logger.debug('Sensor reading recorded');
  } catch (err) {
    logger.warn('History: failed to record sensor reading', { error: (err as Error).message });

    // Mark device offline
    if (esp32DeviceId) {
      await prisma.device
        .update({ where: { id: esp32DeviceId }, data: { status: 'OFFLINE' } })
        .catch(() => {});
    }
  }
}

/**
 * Start the periodic recording loop.
 */
export async function startHistoryRecording(): Promise<void> {
  await loadDeviceId();
  recordingTimer = setInterval(recordReading, config.historyIntervalMs);
  logger.info(`History recording started (interval: ${config.historyIntervalMs}ms)`);
}

/**
 * Stop recording.
 */
export function stopHistoryRecording(): void {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

/**
 * Calculate the start date for a given time range.
 */
function getStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case '1h':  return new Date(now.getTime() - 1 * 60 * 60 * 1000);
    case '6h':  return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

/**
 * Get historical sensor readings for a given time range.
 */
export async function getHistoricalReadings(range: TimeRange = '24h', limit = 500) {
  const startDate = getStartDate(range);

  try {
    const readings = await prisma.sensorReading.findMany({
      where: { timestamp: { gte: startDate } },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
    return readings;
  } catch (err) {
    logger.error('Failed to get historical readings', { error: (err as Error).message });
    return [];
  }
}

/**
 * Get the most recent sensor reading from DB.
 */
export async function getLatestReading() {
  try {
    return await prisma.sensorReading.findFirst({
      orderBy: { timestamp: 'desc' },
    });
  } catch {
    return null;
  }
}
