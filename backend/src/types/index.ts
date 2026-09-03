// ============================================================
// SHARED TYPES — used across backend services and controllers
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
}

export interface DeviceStatus {
  esp32: {
    online: boolean;
    ip: string;
    lastSeen: string | null;
  };
  camera: {
    online: boolean;
    ip: string;
    lastSeen: string | null;
  };
  database: {
    connected: boolean;
  };
  ai: {
    available: boolean;
  };
}

export interface IrrigationDecision {
  shouldPump: boolean;
  reason: string;
  waterSafe: boolean;
}

export type AlertType =
  | 'VERY_DRY_SOIL'
  | 'LOW_WATER'
  | 'CRITICAL_WATER'
  | 'HIGH_TEMPERATURE'
  | 'HIGH_HUMIDITY'
  | 'LOW_HUMIDITY'
  | 'SENSOR_FAILURE'
  | 'ESP32_OFFLINE'
  | 'ESP32_CAM_OFFLINE'
  | 'PUMP_FAILURE'
  | 'DATABASE_FAILURE'
  | 'AI_UNAVAILABLE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertPayload {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  language?: string;
}

export interface AIRecommendationRequest {
  soilAverage: number;
  soil1?: number;
  soil2?: number;
  temperature: number;
  humidity: number;
  waterLevel: number;
  light: number;
  language?: string;
}

export interface AIRecommendationResponse {
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

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
