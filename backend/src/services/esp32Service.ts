// ============================================================
// ESP32 SERVICE — Proxies requests to the main ESP32 hardware
// Handles timeout, offline detection, and demo mode fallback
// ============================================================

import axios from 'axios';
import { config } from '../config';
import { SensorData } from '../types';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tracks live status
let esp32Online = false;
let esp32LastSeen: Date | null = null;

async function getEsp32Url(endpoint: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'esp32_ip' } });
    if (setting && setting.value) {
      return `http://${setting.value}${endpoint}`;
    }
  } catch (err) {
    // Ignore db error, use fallback
  }
  return `${config.esp32BaseUrl}${endpoint}`;
}

// Demo sensor data — used when ESP32 is offline and DEMO_MODE=true
function getDemoSensorData(): SensorData {
  const t = Date.now() / 10000;
  return {
    soil1: Math.round(35 + Math.sin(t) * 20),
    soil2: Math.round(40 + Math.cos(t) * 15),
    soilAverage: Math.round(37 + Math.sin(t) * 17),
    temperature: parseFloat((27 + Math.sin(t * 0.5) * 8).toFixed(1)),
    humidity: parseFloat((55 + Math.cos(t * 0.3) * 20).toFixed(1)),
    light: Math.round(400 + Math.sin(t * 0.8) * 350),
    waterLevel: Math.round(65 + Math.cos(t * 0.4) * 30),
    pump: false,
    mode: 'AUTO',
    timestamp: new Date().toISOString(),
    isDemo: true,
  };
}

/**
 * Fetch current sensor data from ESP32.
 * Falls back to demo data if ESP32 is unreachable and DEMO_MODE is enabled.
 */
export async function fetchSensorData(): Promise<SensorData> {
  let url = '';
  try {
    url = await getEsp32Url('/data');
    const response = await axios.get<SensorData>(
      url,
      { timeout: config.esp32TimeoutMs }
    );

    esp32Online = true;
    esp32LastSeen = new Date();

    return {
      ...response.data,
      timestamp: new Date().toISOString(),
      isDemo: false,
    };
  } catch (err) {
    esp32Online = false;
    logger.warn(`ESP32 unreachable at ${url || config.esp32BaseUrl}`, {
      error: (err as Error).message,
    });

    if (config.demoMode) {
      logger.info('DEMO_MODE: Returning simulated sensor data');
      return getDemoSensorData();
    }

    throw new Error(`ESP32 offline: ${(err as Error).message}`);
  }
}

/**
 * Send pump ON command to ESP32.
 */
export async function sendPumpOn(): Promise<boolean> {
  try {
    const url = await getEsp32Url('/pump/on');
    await axios.get(url, {
      timeout: config.esp32TimeoutMs,
    });
    logger.info('Pump ON command sent to ESP32');
    return true;
  } catch (err) {
    logger.error('Failed to send pump ON to ESP32', { error: (err as Error).message });
    return false;
  }
}

/**
 * Send pump OFF command to ESP32.
 */
export async function sendPumpOff(): Promise<boolean> {
  try {
    const url = await getEsp32Url('/pump/off');
    await axios.get(url, {
      timeout: config.esp32TimeoutMs,
    });
    logger.info('Pump OFF command sent to ESP32');
    return true;
  } catch (err) {
    logger.error('Failed to send pump OFF to ESP32', { error: (err as Error).message });
    return false;
  }
}

/**
 * Set AUTO irrigation mode on ESP32.
 */
export async function sendModeAuto(): Promise<boolean> {
  try {
    const url = await getEsp32Url('/mode/auto');
    await axios.get(url, {
      timeout: config.esp32TimeoutMs,
    });
    return true;
  } catch (err) {
    logger.error('Failed to set AUTO mode on ESP32', { error: (err as Error).message });
    return false;
  }
}

/**
 * Set MANUAL mode on ESP32.
 */
export async function sendModeManual(): Promise<boolean> {
  try {
    const url = await getEsp32Url('/mode/manual');
    await axios.get(url, {
      timeout: config.esp32TimeoutMs,
    });
    return true;
  } catch (err) {
    logger.error('Failed to set MANUAL mode on ESP32', { error: (err as Error).message });
    return false;
  }
}

/**
 * Check if ESP32 is reachable (ping /data).
 */
export async function checkEsp32Health(): Promise<boolean> {
  try {
    const url = await getEsp32Url('/data');
    await axios.get(url, {
      timeout: config.esp32TimeoutMs,
    });
    esp32Online = true;
    esp32LastSeen = new Date();
    return true;
  } catch {
    esp32Online = false;
    return false;
  }
}

export function getEsp32Status() {
  return {
    online: esp32Online,
    ip: 'See Settings',
    lastSeen: esp32LastSeen ? esp32LastSeen.toISOString() : null,
  };
}
