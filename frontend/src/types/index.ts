// ============================================================
// FRONTEND SHARED TYPES
// ============================================================

export interface SensorData {
  soil1: number | null;
  soil2: number | null;
  soilAverage: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  waterLevel: number | null;
  pump: boolean;
  mode: 'AUTO' | 'MANUAL';
  timestamp?: string;
  isDemo?: boolean;
  soilStatus?: string;
  temperatureStatus?: string;
  humidityStatus?: string;
  lightStatus?: string;
  waterStatus?: string;
}

export interface DeviceStatus {
  esp32: { online: boolean; ip: string; lastSeen: string | null };
  camera: { online: boolean; ip: string; captureUrl?: string; lastSeen: string | null };
  database: { connected: boolean };
  ai: { available: boolean };
  lastChecked?: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  resolved: boolean;
}

export interface AIRecommendation {
  soilStatus: string;
  irrigation: 'START' | 'STOP' | 'MAINTAIN';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  reason: string;
  actions: string[];
  temperatureStatus: string;
  humidityStatus: string;
  waterStatus: string;
}

export interface SensorReading {
  id: string;
  timestamp: string;
  soil1: number | null;
  soil2: number | null;
  soilAverage: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  waterLevel: number | null;
  pumpState: boolean;
  mode: string;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
export type Language = 'en' | 'ta' | 'hi';
export type Theme = 'light' | 'dark';
