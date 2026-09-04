// ============================================================
// API SERVICE — Backend API calls with direct hardware fallback
// Seamlessly bridges cloud deployments with local ESP32 / ESP32-CAM
// ============================================================

import axios from 'axios';
import { SensorData, DeviceStatus, Alert, AIRecommendation, SensorReading, TimeRange, Language } from '../types';

export function getEsp32LocalIp(): string {
  return localStorage.getItem('esp32_ip') || '192.168.100.58';
}

export function setEsp32LocalIp(ip: string): void {
  localStorage.setItem('esp32_ip', ip);
}

export function getCameraLocalIp(): string {
  return localStorage.getItem('esp32_cam_ip') || '192.168.100.94';
}

export function setCameraLocalIp(ip: string): void {
  localStorage.setItem('esp32_cam_ip', ip);
}

const baseURL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 6000,
  headers: { 'Content-Type': 'application/json' },
});

// Helper: parse raw ESP32 JSON directly in browser
function parseDirectEsp32Json(rawText: string): SensorData {
  const sanitized = rawText
    .replace(/:\s*nan\b/gi, ': null')
    .replace(/:\s*undefined\b/gi, ': null');
  const parsed = JSON.parse(sanitized);

  const soil1 = parsed.soil1 ?? parsed.capacitive ?? null;
  const soil2 = parsed.soil2 ?? parsed.resistive ?? null;
  let soilAverage = parsed.soilAverage ?? parsed.soil ?? null;
  if (soilAverage === null && soil1 !== null && soil2 !== null) {
    soilAverage = Math.round((Number(soil1) + Number(soil2)) / 2);
  }

  const temperature = parsed.temperature !== undefined && !isNaN(parsed.temperature) ? Number(parsed.temperature) : null;
  const humidity = parsed.humidity !== undefined && !isNaN(parsed.humidity) ? Number(parsed.humidity) : null;
  const light = parsed.light !== undefined ? Number(parsed.light) : null;
  const waterLevel = parsed.waterLevel !== undefined ? Number(parsed.waterLevel) : null;
  const pump = Boolean(parsed.pump);
  const mode: 'AUTO' | 'MANUAL' = (parsed.mode === 'MANUAL' || parsed.manual === true) ? 'MANUAL' : 'AUTO';

  return {
    soil1: soil1 !== null ? Number(soil1) : null,
    soil2: soil2 !== null ? Number(soil2) : null,
    soilAverage: soilAverage !== null ? Number(soilAverage) : null,
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

// ── Sensor Data ────────────────────────────────────────────
export async function getCurrentSensors(): Promise<SensorData> {
  const esp32Ip = getEsp32LocalIp();

  // 1. Try backend API first (contains real ingested hardware readings)
  try {
    const res = await api.get('/sensors/current');
    const data = res.data.data;
    if (data && !data.isDemo) {
      return data;
    }
  } catch {
    // Continue to direct hardware fallback
  }

  // 2. Direct browser fallback if not on strict HTTPS or if accessible
  if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
    try {
      const directRes = await fetch(`http://${esp32Ip}/api/data`, { signal: AbortSignal.timeout(2000) });
      if (directRes.ok) {
        const text = await directRes.text();
        const liveData = parseDirectEsp32Json(text);

        // Ingest into backend in background to save history
        api.post('/sensors/data', liveData).catch(() => {});
        return liveData;
      }
    } catch {
      // Try /data route
      try {
        const directRes2 = await fetch(`http://${esp32Ip}/data`, { signal: AbortSignal.timeout(2000) });
        if (directRes2.ok) {
          const text = await directRes2.text();
          const liveData = parseDirectEsp32Json(text);
          api.post('/sensors/data', liveData).catch(() => {});
          return liveData;
        }
      } catch {
        // Ignore
      }
    }
  }

  // 3. Fallback: ask backend for latest or demo data
  const fallback = await api.get('/sensors/current');
  return fallback.data.data;
}

export async function getSensorHistory(range: TimeRange = '24h'): Promise<SensorReading[]> {
  const res = await api.get(`/readings/history?range=${range}`);
  return res.data.data;
}

// ── Device Status ──────────────────────────────────────────
export async function getDeviceStatus(): Promise<DeviceStatus> {
  const esp32Ip = getEsp32LocalIp();
  const camIp = getCameraLocalIp();

  let backendStatus: DeviceStatus | null = null;
  try {
    const res = await api.get('/device/status');
    backendStatus = res.data.data;
  } catch {
    // Ignore
  }

  const finalStatus: DeviceStatus = backendStatus || {
    esp32: { online: false, ip: esp32Ip, lastSeen: null },
    camera: { online: false, ip: camIp, lastSeen: null },
    database: { connected: true },
    ai: { available: true },
  };

  // Ensure IPs reflect user preference if not set by backend
  if (!finalStatus.esp32.ip) finalStatus.esp32.ip = esp32Ip;
  if (!finalStatus.camera.ip) finalStatus.camera.ip = camIp;

  // Direct browser check for ESP32 if running locally
  if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
    try {
      const espCheck = await fetch(`http://${esp32Ip}/data`, { signal: AbortSignal.timeout(1500) });
      if (espCheck.ok) {
        finalStatus.esp32.online = true;
        finalStatus.esp32.lastSeen = new Date().toISOString();
      }
    } catch {
      // Keep backend status
    }
  }

  return finalStatus;
}

// ── Pump Control (Ultra-Fast Dual Dispatch) ─────────────────
export async function pumpOn(): Promise<{ success: boolean; message: string }> {
  const esp32Ip = getEsp32LocalIp();

  // 1. Direct local Wi-Fi call with ultra-low latency (~20ms)
  if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
    try {
      const direct = await fetch(`http://${esp32Ip}/pump/on`, { signal: AbortSignal.timeout(600) });
      if (direct.ok) {
        // Sync with backend in background
        api.post('/pump/on').catch(() => {});
        return { success: true, message: 'Pump turned ON' };
      }
    } catch {
      // Continue to cloud call
    }
  }

  // 2. Cloud backend call (queued instantaneously)
  try {
    const res = await api.post('/pump/on');
    if (res.data && res.data.success) return res.data;
  } catch {}

  return { success: false, message: 'Could not connect to pump controller' };
}

export async function pumpOff(): Promise<{ success: boolean; message: string }> {
  const esp32Ip = getEsp32LocalIp();

  if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
    try {
      const direct = await fetch(`http://${esp32Ip}/pump/off`, { signal: AbortSignal.timeout(600) });
      if (direct.ok) {
        api.post('/pump/off').catch(() => {});
        return { success: true, message: 'Pump turned OFF' };
      }
    } catch {
      // Continue
    }
  }

  try {
    const res = await api.post('/pump/off');
    if (res.data && res.data.success) return res.data;
  } catch {}

  return { success: false, message: 'Could not connect to pump controller' };
}

export async function setAutoMode(): Promise<{ success: boolean }> {
  const esp32Ip = getEsp32LocalIp();

  if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
    try {
      const direct = await fetch(`http://${esp32Ip}/mode/auto`, { signal: AbortSignal.timeout(600) });
      if (direct.ok) {
        api.post('/mode/auto').catch(() => {});
        return { success: true };
      }
    } catch {}
  }

  try {
    const res = await api.post('/mode/auto');
    if (res.data && res.data.success) return res.data;
  } catch {}

  return { success: false };
}

export async function setManualMode(): Promise<{ success: boolean }> {
  const esp32Ip = getEsp32LocalIp();

  if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
    try {
      const direct = await fetch(`http://${esp32Ip}/mode/manual`, { signal: AbortSignal.timeout(600) });
      if (direct.ok) {
        api.post('/mode/manual').catch(() => {});
        return { success: true };
      }
    } catch {}
  }

  try {
    const res = await api.post('/mode/manual');
    if (res.data && res.data.success) return res.data;
  } catch {}

  return { success: false };
}

// ── Camera ─────────────────────────────────────────────────
export function getCameraUrl(cacheBust?: number): string {
  return `${baseURL}/camera/latest${cacheBust ? `?t=${cacheBust}` : ''}`;
}

export async function toggleCameraLight(on: boolean): Promise<boolean> {
  const camIp = getCameraLocalIp();
  try {
    const res = await api.post('/camera/light', { on });
    return res.data.success;
  } catch {
    if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
      try {
        await fetch(`http://${camIp}/light/${on ? 'on' : 'off'}`, { mode: 'no-cors' });
        return true;
      } catch {}
    }
    return false;
  }
}

export async function setCameraResolution(high: boolean): Promise<boolean> {
  const camIp = getCameraLocalIp();
  try {
    const res = await api.post('/camera/resolution', { high });
    return res.data.success;
  } catch {
    if (window.location.protocol === 'http:' || window.location.hostname === 'localhost') {
      try {
        await fetch(`http://${camIp}/resolution/${high ? 'high' : 'low'}`, { mode: 'no-cors' });
        return true;
      } catch {}
    }
    return false;
  }
}

// ── Alerts ─────────────────────────────────────────────────
export async function getAlerts(): Promise<Alert[]> {
  const res = await api.get('/alerts');
  return res.data.data;
}

export async function resolveAlert(id: string): Promise<boolean> {
  const res = await api.post(`/alerts/${id}/resolve`);
  return res.data.success;
}

// ── AI Recommendations & Q&A ──────────────────────────────
export async function getAIRecommendation(
  sensorData: SensorData,
  language: Language = 'en'
): Promise<AIRecommendation> {
  const res = await api.post('/ai/recommendation', {
    soil1: sensorData.soil1,
    soil2: sensorData.soil2,
    soilAverage: sensorData.soilAverage,
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    light: sensorData.light,
    waterLevel: sensorData.waterLevel,
    language,
  });
  return res.data.data;
}

export async function askAIQuestion(
  question: string,
  sensorData?: Partial<SensorData>,
  language: Language = 'en'
): Promise<{
  answer: string;
  rainForecast?: { probability: number; alert: string; advice: string };
  suggestedActions?: string[];
}> {
  const res = await api.post('/ai/ask', {
    question,
    sensorData,
    language,
  });
  return res.data.data;
}

// ── Settings ───────────────────────────────────────────────
export async function getSettings(): Promise<Record<string, string>> {
  try {
    const res = await api.get('/settings');
    const dbSettings = res.data.data || {};
    // Merge with localStorage
    return {
      esp32_ip: getEsp32LocalIp(),
      esp32_cam_ip: getCameraLocalIp(),
      ...dbSettings,
    };
  } catch {
    return {
      esp32_ip: getEsp32LocalIp(),
      esp32_cam_ip: getCameraLocalIp(),
    };
  }
}

export async function updateSettings(settings: Record<string, string>): Promise<boolean> {
  if (settings.esp32_ip) setEsp32LocalIp(settings.esp32_ip);
  if (settings.esp32_cam_ip) setCameraLocalIp(settings.esp32_cam_ip);

  try {
    const res = await api.post('/settings', settings);
    return res.data.success;
  } catch {
    return true; // LocalStorage already updated
  }
}
