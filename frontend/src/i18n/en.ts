// ============================================================
// ENGLISH TRANSLATIONS
// ============================================================

export const en = {
  // ── App ────────────────────────────────────────────────
  appName: 'AI Smart Farming Assistant',
  appTagline: 'Intelligent Agriculture Monitoring',

  // ── Navigation ────────────────────────────────────────
  dashboard: 'Dashboard',
  history: 'History',
  alerts: 'Alerts',
  settings: 'Settings',
  aiAssistant: 'AI Assistant',

  // ── System Status ─────────────────────────────────────
  systemStatus: 'System Status',
  online: 'Online',
  offline: 'Offline',
  connected: 'Connected',
  disconnected: 'Disconnected',
  available: 'Available',
  unavailable: 'Unavailable',
  lastSeen: 'Last seen',
  lastUpdated: 'Last updated',

  // ── Sensors ───────────────────────────────────────────
  sensors: 'Sensors',
  soilMoisture: 'Soil Moisture',
  soilSensor1: 'Soil Sensor 1',
  soilSensor2: 'Soil Sensor 2',
  averageSoil: 'Average Soil',
  temperature: 'Temperature',
  humidity: 'Humidity',
  light: 'Light Level',
  waterLevel: 'Water Level',

  // ── Soil Status ───────────────────────────────────────
  veryDry: 'Very Dry',
  moderate: 'Moderate',
  good: 'Good',
  wet: 'Wet',
  irrigationRecommended: 'Irrigation Recommended',
  soilAdequate: 'Soil Moisture Adequate',

  // ── Temperature ───────────────────────────────────────
  normal: 'Normal',
  warning: 'Warning',
  highTemp: 'High Temperature',
  tempNormal: 'Temperature Normal',
  tempWarning: 'Temperature Warning',
  tempHigh: 'High Temperature Alert',

  // ── Humidity ──────────────────────────────────────────
  lowHumidity: 'Low Humidity',
  highHumidity: 'High Humidity',
  normalHumidity: 'Normal Humidity',

  // ── Light ─────────────────────────────────────────────
  dark: 'Dark',
  normalLight: 'Normal Light',
  bright: 'Bright',

  // ── Water Level ───────────────────────────────────────
  waterSafe: 'Safe',
  waterLow: 'Low Water',
  waterCritical: 'Critical',
  lowWaterWarning: 'Water Level Low',
  criticalWaterWarning: 'Water Level Critical — Pump Disabled',

  // ── Pump ──────────────────────────────────────────────
  pump: 'Pump',
  pumpControl: 'Pump Control',
  pumpOn: 'Pump ON',
  pumpOff: 'Pump OFF',
  pumpRunning: 'Pump Running',
  pumpStopped: 'Pump Stopped',
  autoMode: 'Auto Mode',
  manualMode: 'Manual Mode',
  turnPumpOn: 'Turn Pump ON',
  turnPumpOff: 'Turn Pump OFF',
  setAutoMode: 'Set Auto Mode',
  setManualMode: 'Set Manual Mode',

  // ── Camera ────────────────────────────────────────────
  camera: 'Camera',
  cameraFeed: 'Camera Feed',
  refreshCamera: 'Refresh Camera',
  autoRefresh: 'Auto Refresh',
  cameraOffline: 'Camera Offline',
  cameraConnecting: 'Connecting...',

  // ── AI ────────────────────────────────────────────────
  aiRecommendations: 'AI Recommendations',
  getAIAdvice: 'Get AI Advice',
  analyzing: 'Analyzing...',
  urgency: 'Urgency',
  recommendation: 'Recommendation',
  actions: 'Recommended Actions',
  soilStatus: 'Soil Status',
  irrigationAction: 'Irrigation Action',

  // ── Urgency ───────────────────────────────────────────
  urgencyLow: 'Low',
  urgencyMedium: 'Medium',
  urgencyHigh: 'High',
  urgencyCritical: 'Critical',

  // ── Alerts ────────────────────────────────────────────
  noAlerts: 'No Active Alerts',
  resolveAlert: 'Resolve',
  allAlerts: 'All Alerts',
  activeAlerts: 'Active Alerts',
  alertResolved: 'Alert resolved',
  severity: 'Severity',
  info: 'Info',
  critical: 'Critical',

  // ── Charts ────────────────────────────────────────────
  timeRange: 'Time Range',
  oneHour: '1 Hour',
  sixHours: '6 Hours',
  twentyFourHours: '24 Hours',
  sevenDays: '7 Days',
  thirtyDays: '30 Days',
  noData: 'No data available',

  // ── Settings ──────────────────────────────────────────
  language: 'Language',
  theme: 'Theme',
  save: 'Save',
  saved: 'Saved!',
  cancel: 'Cancel',
  refresh: 'Refresh',

  // ── Rain & Weather ───────────────────────────────────
  rainProbability: 'Rain Probability',
  rainAlert: 'Possibility of Rain Alert',
  rainHigh: 'Rain Likely (🌧️ High Alert)',
  rainModerate: 'Moderate Chance (Cloudy)',
  rainLow: 'Low Chance (Clear & Dry)',
  rainDelayIrrigation: 'Rain is likely. Postpone irrigation to save water.',
  rainNormalIrrigation: 'Dry conditions. Maintain regular watering.',

  // ── AI Chat ───────────────────────────────────────────
  askAI: 'Ask AI Farm Assistant',
  askAIPlaceholder: 'Ask anything about crops, soil, rain probability, pest control...',
  askAIButton: 'Ask Question',
  aiTyping: 'AI is thinking...',
  suggestedQuestions: 'Quick Questions',

  // ── Camera HD ─────────────────────────────────────────
  hdMode: 'HD Mode',
  hdStream: 'HD Stream',
  expandStream: 'Expand',
  compactStream: 'Compact',

  // ── Demo ──────────────────────────────────────────────
  demoMode: '⚠ DEMO DATA — ESP32 Offline',
  demoModeDesc: 'Showing simulated sensor data. Connect ESP32 for live readings.',

  // ── Errors ────────────────────────────────────────────
  esp32Offline: 'ESP32 is offline',
  cameraOfflineDesc: 'ESP32-CAM is not reachable. Check network connection.',
  loadingError: 'Failed to load data',
  retrying: 'Retrying...',
};

export type TranslationKey = keyof typeof en;
