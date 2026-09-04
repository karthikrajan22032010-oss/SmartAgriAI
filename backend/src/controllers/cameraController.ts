import { Request, Response } from 'express';
import {
  fetchCameraCapture,
  getCameraStatus,
  toggleCameraLight,
  setCameraResolution,
  updateCameraSnapshot,
  getLatestSnapshot,
} from '../services/cameraService';
import { logger } from '../utils/logger';

export async function getCameraCapture(req: Request, res: Response): Promise<void> {
  try {
    const imageBuffer = await fetchCameraCapture();
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store',
      'Content-Length': imageBuffer.length.toString(),
      'Access-Control-Allow-Origin': '*',
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

export async function getLatestSnapshotHandler(req: Request, res: Response): Promise<void> {
  const snapshot = getLatestSnapshot();
  if (snapshot) {
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store',
      'Content-Length': snapshot.length.toString(),
      'Access-Control-Allow-Origin': '*',
    });
    res.send(snapshot);
    return;
  }
  return getCameraCapture(req, res);
}

export async function ingestSnapshot(req: Request, res: Response): Promise<void> {
  try {
    let buffer: Buffer | null = null;
    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (typeof req.body === 'string' && req.body.startsWith('data:image')) {
      const base64Data = req.body.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (req.body && req.body.image) {
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ success: false, error: 'No image data provided' });
      return;
    }

    updateCameraSnapshot(buffer, req.ip || undefined);
    res.json({ success: true, message: 'Camera snapshot received', size: buffer.length });
  } catch (err) {
    logger.error('Failed to ingest camera snapshot', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
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
