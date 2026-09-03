// ============================================================
// DEVICE STATUS CONTROLLER
// ============================================================

import { Request, Response } from 'express';
import { getEsp32Status, checkEsp32Health } from '../services/esp32Service';
import { getCameraStatus, checkCameraHealth } from '../services/cameraService';
import { isDbAvailable } from '../services/alertService';
import { isAIAvailable } from '../services/aiService';

export async function getDeviceStatus(req: Request, res: Response): Promise<void> {
  // Run checks in parallel
  const [esp32Health, camHealth] = await Promise.all([
    checkEsp32Health(),
    checkCameraHealth(),
  ]);

  res.json({
    success: true,
    data: {
      esp32: getEsp32Status(),
      camera: getCameraStatus(),
      database: { connected: isDbAvailable() },
      ai: { available: isAIAvailable() },
      lastChecked: new Date().toISOString(),
    },
  });
}

export async function getHealthCheck(req: Request, res: Response): Promise<void> {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'AI Smart Farming Assistant Backend',
  });
}
