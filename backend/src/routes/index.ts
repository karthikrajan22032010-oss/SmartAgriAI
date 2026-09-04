// ============================================================
// ALL API ROUTES — assembled in one file for clarity
// ============================================================

import { Router } from 'express';
import { getCurrentSensors, getSensorHistory, getLatestSensor, ingestSensorData } from '../controllers/sensorController';
import { turnPumpOn, turnPumpOff, setAutoMode, setManualMode, getPumpStatus } from '../controllers/pumpController';
import { getDeviceStatus, getHealthCheck } from '../controllers/deviceController';
import { listAlerts, resolveAlertById } from '../controllers/alertController';
import { getRecommendation, askQuestion } from '../controllers/aiController';
import { getCameraCapture, getCameraStatusHandler, toggleLight, setResolution, getLatestSnapshotHandler, ingestSnapshot } from '../controllers/cameraController';
import { getSettings, updateSettings } from '../controllers/settingsController';

const router = Router();

// ── Health ─────────────────────────────────────────────────
router.get('/health', getHealthCheck);

// ── Device Status ──────────────────────────────────────────
router.get('/device/status', getDeviceStatus);

// ── Sensor Data ────────────────────────────────────
router.get('/sensors/current', getCurrentSensors);
router.get('/sensors/latest', getLatestSensor);
router.post('/sensors/data', ingestSensorData);
router.post('/sensors/ingest', ingestSensorData);
router.get('/readings/history', getSensorHistory);
router.get('/readings', getSensorHistory);  // alias

// ── Pump Control ───────────────────────────────────────────
router.get('/pump/status', getPumpStatus);
router.post('/pump/on', turnPumpOn);
router.post('/pump/off', turnPumpOff);
router.post('/mode/auto', setAutoMode);
router.post('/mode/manual', setManualMode);

// ── Camera ─────────────────────────────────────────────────
router.get('/camera/capture', getCameraCapture);
router.get('/camera/latest', getLatestSnapshotHandler);
router.post('/camera/snapshot', ingestSnapshot);
router.get('/camera/status', getCameraStatusHandler);
router.post('/camera/light', toggleLight);
router.post('/camera/resolution', setResolution);

// ── Alerts ─────────────────────────────────────────────────
router.get('/alerts', listAlerts);
router.post('/alerts/:id/resolve', resolveAlertById);

// ── AI ─────────────────────────────────────────────────────
router.post('/ai/recommendation', getRecommendation);
router.post('/ai/ask', askQuestion);
router.post('/ai/chat', askQuestion);

// ── Settings ───────────────────────────────────────────────
router.get('/settings', getSettings);
router.post('/settings', updateSettings);

export default router;
