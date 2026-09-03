// ============================================================
// CAMERA CONTROLLER — Proxies ESP32-CAM capture
// ============================================================

import { Request, Response } from 'express';
import { fetchCameraCapture, getCameraStatus, toggleCameraLight, setCameraResolution } from '../services/cameraService';
import { logger } from '../utils/logger';

export async function getCameraCapture(req: Request, res: Response): Promise<void> {
  try {
    const imageBuffer = await fetchCameraCapture();
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store',
      'Content-Length': imageBuffer.length.toString(),
    });
    res.send(imageBuffer);
  } catch (err) {
    logger.warn('Camera capture failed', { error: (err as Error).message });
    res.status(503).json({
      success: false,
      error: 'Camera offline',
      message: (err as Error).message,
    });
  }
}

export async function getCameraStatusHandler(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: getCameraStatus() });
}

export async function toggleLight(req: Request, res: Response): Promise<void> {
  const { on } = req.body;
  const success = await toggleCameraLight(Boolean(on));
  res.json({ success });
}

export async function setResolution(req: Request, res: Response): Promise<void> {
  const { high } = req.body;
  const success = await setCameraResolution(Boolean(high));
  res.json({ success });
}
