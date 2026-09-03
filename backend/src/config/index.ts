// ============================================================
// CENTRAL CONFIGURATION
// All hardware IPs and environment settings live here.
// To change IPs, update your .env file.
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // ── Server ─────────────────────────────────────────────
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // ── Hardware IP Addresses ───────────────────────────────
  // MAIN ESP32 controller
  esp32Ip: process.env.ESP32_IP || '192.168.150.103',
  // ESP32-CAM camera module
  esp32CamIp: process.env.ESP32_CAM_IP || '192.168.150.102',

  // ── Hardware Timeouts ───────────────────────────────────
  esp32TimeoutMs: parseInt(process.env.ESP32_TIMEOUT_MS || '5000', 10),

  // ── Derived URLs (built from IPs) ───────────────────────
  get esp32BaseUrl() { return `http://${this.esp32Ip}`; },
  get esp32CamBaseUrl() { return `http://${this.esp32CamIp}`; },

  // ── Database ────────────────────────────────────────────
  databaseUrl: process.env.DATABASE_URL || '',

  // ── AI Service ──────────────────────────────────────────
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-1.5-flash',

  // ── CORS ────────────────────────────────────────────────
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5500').split(','),

  // ── History Recording ───────────────────────────────────
  historyIntervalMs: parseInt(process.env.HISTORY_INTERVAL_MS || '30000', 10),

  // ── Demo Mode ───────────────────────────────────────────
  // When true, returns simulated sensor data if ESP32 is offline
  demoMode: process.env.DEMO_MODE === 'true',

  // ── Irrigation Thresholds ───────────────────────────────
  soilPumpOnThreshold: 30,    // % — pump turns ON below this
  soilPumpOffThreshold: 60,   // % — pump turns OFF above this
  waterLevelMinSafe: 20,      // % — pump blocked below this
  waterLevelCritical: 10,     // % — critical alert

  // ── Temperature Thresholds ─────────────────────────────
  tempWarning: 30,            // °C
  tempHigh: 35,               // °C

  // ── Humidity Thresholds ────────────────────────────────
  humidityLow: 40,            // %
  humidityHigh: 70,           // %

  // ── LDR Thresholds (configurable for different modules) ─
  ldrDark: 200,               // raw ADC value below this = DARK
  ldrBright: 700,             // raw ADC value above this = BRIGHT
};

export type Config = typeof config;
