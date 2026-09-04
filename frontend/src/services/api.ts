// ============================================================
// API SERVICE — All backend API calls from the frontend
// All requests go through the backend (never directly to ESP32)
// ============================================================

import axios from 'axios';
import { SensorData, DeviceStatus, Alert, AIRecommendation, SensorReading, TimeRange, Language } from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Sensor Data ────────────────────────────────────────────
export async function getCurrentSensors(): Promise<SensorData> {
  const res = await api.get('/sensors/current');
  return res.data.data;
}

export async function getSensorHistory(range: TimeRange = '24h'): Promise<SensorReading[]> {
  const res = await api.get(`/readings/history?range=${range}`);
  return res.data.data;
}

// ── Device Status ──────────────────────────────────────────
export async function getDeviceStatus(): Promise<DeviceStatus> {
  const res = await api.get('/device/status');
  return res.data.data;
}

// ── Pump Control ───────────────────────────────────────────
export async function pumpOn(): Promise<{ success: boolean; message: string }> {
  const res = await api.post('/pump/on');
  return res.data;
}

export async function pumpOff(): Promise<{ success: boolean; message: string }> {
  const res = await api.post('/pump/off');
  return res.data;
}

export async function setAutoMode(): Promise<{ success: boolean }> {
  const res = await api.post('/mode/auto');
  return res.data;
}

export async function setManualMode(): Promise<{ success: boolean }> {
  const res = await api.post('/mode/manual');
  return res.data;
}

// ── Camera ─────────────────────────────────────────────────
// Returns a URL that the browser can use as an <img> src
export function getCameraUrl(cacheBust?: number): string {
  return `${baseURL}/camera/capture${cacheBust ? `?t=${cacheBust}` : ''}`;
}

export async function toggleCameraLight(on: boolean): Promise<boolean> {
  const res = await api.post('/camera/light', { on });
  return res.data.success;
}

export async function setCameraResolution(high: boolean): Promise<boolean> {
  const res = await api.post('/camera/resolution', { high });
  return res.data.success;
}

// ── Alerts ─────────────────────────────────────────────────
export async function getAlerts(limit = 50): Promise<Alert[]> {
  const res = await api.get(`/alerts?limit=${limit}`);
  return res.data.data;
}

export async function resolveAlert(id: string): Promise<boolean> {
  const res = await api.post(`/alerts/${id}/resolve`);
  return res.data.success;
}

export async function getAIRecommendation(
  sensorData: SensorData,
  language: Language = 'en'
): Promise<AIRecommendation> {
  const res = await api.post('/ai/recommendation', {
    soilAverage: sensorData.soilAverage,
    soil1: sensorData.soil1,
    soil2: sensorData.soil2,
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    waterLevel: sensorData.waterLevel,
    light: sensorData.light,
    language,
  });
  return res.data.data;
}

export async function askAIQuestion(
  question: string,
  sensorData?: SensorData | null,
  language: Language = 'en'
): Promise<{ answer: string; rainForecast?: { probability: number; alert: string; advice: string } }> {
  const res = await api.post('/ai/ask', {
    question,
    sensorData: sensorData || undefined,
    language,
  });
  return res.data.data;
}

// ── Settings ───────────────────────────────────────────────
export async function getSettings(): Promise<Record<string, string>> {
  const res = await api.get('/settings');
  return res.data.data;
}

export async function updateSettings(settings: Record<string, string>): Promise<boolean> {
  const res = await api.post('/settings', settings);
  return res.data.success;
}

// ── Health ─────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
}
