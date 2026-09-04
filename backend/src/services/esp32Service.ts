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
let currentEsp32Ip = '192.168.100.58';
let latestLiveSensorData: SensorData | null = null;

import net from 'net';

export function updateEsp32IngestedData(data: SensorData, ip?: string) {
  esp32Online = true;
  esp32LastSeen = new Date();
  latestLiveSensorData = {
    ...data,
    isDemo: false,
    timestamp: new Date().toISOString(),
  };
  if (ip) currentEsp32Ip = ip;
}

async function getEsp32Ip(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'esp32_ip' } });
    if (setting && setting.value) {
      currentEsp32Ip = setting.value;
      return setting.value;
    }
  } catch {
    // Ignore db error
  }
  return currentEsp32Ip;
}

async function getEsp32Url(endpoint: string): Promise<string> {
  const ip = await getEsp32Ip();
  return `http://${ip}${endpoint}`;
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

function parseRawSensorJson(rawText: string): SensorData {
  // Sanitize non-standard JSON tokens like :nan, :NaN, :undefined
  const sanitized = rawText
    .replace(/:\s*nan\b/gi, ': null')
    .replace(/:\s*undefined\b/gi, ': null');

  const parsed = JSON.parse(sanitized);

  const soil1 = parsed.soil1 !== undefined && parsed.soil1 !== null && !isNaN(parsed.soil1)
    ? Number(parsed.soil1)
    : (parsed.capacitive !== undefined && parsed.capacitive !== null && !isNaN(parsed.capacitive) ? Number(parsed.capacitive) : null);

  const soil2 = parsed.soil2 !== undefined && parsed.soil2 !== null && !isNaN(parsed.soil2)
    ? Number(parsed.soil2)
    : (parsed.resistive !== undefined && parsed.resistive !== null && !isNaN(parsed.resistive) ? Number(parsed.resistive) : null);

  let soilAverage = parsed.soilAverage !== undefined && parsed.soilAverage !== null && !isNaN(parsed.soilAverage)
    ? Number(parsed.soilAverage)
    : (parsed.soil !== undefined && parsed.soil !== null && !isNaN(parsed.soil) ? Number(parsed.soil) : null);

  if (soilAverage === null) {
    if (soil1 !== null && soil2 !== null) soilAverage = Math.round((soil1 + soil2) / 2);
    else if (soil1 !== null) soilAverage = soil1;
    else if (soil2 !== null) soilAverage = soil2;
  }

  const temperature = parsed.temperature !== undefined && parsed.temperature !== null && !isNaN(parsed.temperature)
    ? Number(parsed.temperature)
    : null;

  const humidity = parsed.humidity !== undefined && parsed.humidity !== null && !isNaN(parsed.humidity)
    ? Number(parsed.humidity)
    : null;

  const light = parsed.light !== undefined && parsed.light !== null && !isNaN(parsed.light)
    ? Number(parsed.light)
    : null;

  const waterLevel = parsed.waterLevel !== undefined && parsed.waterLevel !== null && !isNaN(parsed.waterLevel)
    ? Number(parsed.waterLevel)
    : null;

  const pump = Boolean(parsed.pump);
  const mode: 'AUTO' | 'MANUAL' = (parsed.mode === 'MANUAL' || parsed.manual === true) ? 'MANUAL' : 'AUTO';

  return {
    soil1,
    soil2,
    soilAverage,
    temperature,
    humidity,
    light,
    waterLevel,
    pump,
    mode,
    timestamp: new Date().toISOString(),
    isDemo: false,
  };
}

/**
 * Fetch current sensor data from ESP32.
 * Falls back to latest database reading or demo data if ESP32 is unreachable on cloud.
 */
export async function fetchSensorData(): Promise<SensorData> {
  // 1. Check in-memory live ingested sensor data first
  if (latestLiveSensorData && esp32LastSeen && (Date.now() - esp32LastSeen.getTime() < 45000)) {
    esp32Online = true;
    return latestLiveSensorData;
  }

  // 2. Try polling local ESP32 IP
  const ip = await getEsp32Ip();
  const endpoints = ['/api/data', '/data'];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    let url = '';
    try {
      url = `http://${ip}${endpoint}`;
      const response = await axios.get(url, {
        timeout: 1500,
        responseType: 'text',
        transformResponse: [(data) => data],
      });

      if (response.status === 200 && response.data) {
        const sensorData = typeof response.data === 'string'
          ? parseRawSensorJson(response.data)
          : parseRawSensorJson(JSON.stringify(response.data));

        esp32Online = true;
        esp32LastSeen = new Date();
        latestLiveSensorData = sensorData;
        return sensorData;
      }
    } catch (err) {
      lastError = err as Error;
    }
  }

  // 3. Check if we have a recent reading in the database
  try {
    const latest = await prisma.sensorReading.findFirst({
      orderBy: { timestamp: 'desc' },
    });
    if (latest && (Date.now() - new Date(latest.timestamp).getTime()) < 60000) {
      esp32Online = true;
      esp32LastSeen = new Date(latest.timestamp);
      return {
        soil1: latest.soil1,
        soil2: latest.soil2,
        soilAverage: latest.soilAverage,
        temperature: latest.temperature,
        humidity: latest.humidity,
        light: latest.light,
        waterLevel: latest.waterLevel,
        pump: latest.pumpState,
        mode: latest.mode as 'AUTO' | 'MANUAL',
        timestamp: latest.timestamp.toISOString(),
        isDemo: false,
      };
    }
  } catch {
    // Ignore DB error
  }

  esp32Online = false;

  // Fallback to demo sensor data
  return getDemoSensorData();
}

/**
 * Send pump ON command to ESP32.
 */
export async function sendPumpOn(): Promise<boolean> {
  const endpoints = ['/pump/on', '/api/pump/on'];
  for (const ep of endpoints) {
    try {
      const url = await getEsp32Url(ep);
      const res = await axios.get(url, { timeout: 3000 });
      if (res.status === 200) {
        logger.info('Pump ON command sent to ESP32');
        return true;
      }
    } catch {
      // Try next
    }
  }
  return false;
}

/**
 * Send pump OFF command to ESP32.
 */
export async function sendPumpOff(): Promise<boolean> {
  const endpoints = ['/pump/off', '/api/pump/off'];
  for (const ep of endpoints) {
    try {
      const url = await getEsp32Url(ep);
      const res = await axios.get(url, { timeout: 3000 });
      if (res.status === 200) {
        logger.info('Pump OFF command sent to ESP32');
        return true;
      }
    } catch {
      // Try next
    }
  }
  return false;
}

/**
 * Set AUTO irrigation mode on ESP32.
 */
export async function sendModeAuto(): Promise<boolean> {
  const endpoints = ['/mode/auto', '/api/mode/auto'];
  for (const ep of endpoints) {
    try {
      const url = await getEsp32Url(ep);
      const res = await axios.get(url, { timeout: 3000 });
      if (res.status === 200) return true;
    } catch {
      // Try next
    }
  }
  return false;
}

/**
 * Set MANUAL mode on ESP32.
 */
export async function sendModeManual(): Promise<boolean> {
  const endpoints = ['/mode/manual', '/api/mode/manual'];
  for (const ep of endpoints) {
    try {
      const url = await getEsp32Url(ep);
      const res = await axios.get(url, { timeout: 3000 });
      if (res.status === 200) return true;
    } catch {
      // Try next
    }
  }
  return false;
}

function checkTcpPort(host: string, port = 80, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * Check if ESP32 is reachable (HTTP endpoint, recent ingestion, or TCP port 80).
 */
export async function checkEsp32Health(): Promise<boolean> {
  if (esp32LastSeen && (Date.now() - esp32LastSeen.getTime() < 45000)) {
    esp32Online = true;
    return true;
  }

  const ip = await getEsp32Ip();
  try {
    const isPortOpen = await checkTcpPort(ip, 80, 1000);
    if (isPortOpen) {
      esp32Online = true;
      esp32LastSeen = new Date();
      return true;
    }
    esp32Online = false;
    return false;
  } catch {
    esp32Online = false;
    return false;
  }
}

export function getEsp32Status() {
  const isRecent = esp32LastSeen ? (Date.now() - esp32LastSeen.getTime() < 45000) : false;
  return {
    online: esp32Online || isRecent,
    ip: currentEsp32Ip,
    lastSeen: esp32LastSeen ? esp32LastSeen.toISOString() : null,
  };
}
