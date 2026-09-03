// ============================================================
// CAMERA SERVICE — Proxies ESP32-CAM image capture requests
// ============================================================

import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let cameraOnline = false;
let cameraLastSeen: Date | null = null;

async function getCameraUrl(endpoint: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'esp32_cam_ip' } });
    if (setting && setting.value) {
      return `http://${setting.value}${endpoint}`;
    }
  } catch (err) {
    // Ignore db error, use fallback
  }
  return `${config.esp32CamBaseUrl}${endpoint}`;
}

/**
 * Fetch the latest JPEG image from ESP32-CAM.
 * Returns a Buffer containing JPEG bytes.
 */
export async function fetchCameraCapture(): Promise<Buffer> {
  let url = '';
  try {
    url = await getCameraUrl('/capture');
    const response = await axios.get<ArrayBuffer>(
      url,
      {
        responseType: 'arraybuffer',
        timeout: config.esp32TimeoutMs,
      }
    );

    cameraOnline = true;
    cameraLastSeen = new Date();

    return Buffer.from(response.data);
  } catch (err) {
    cameraOnline = false;
    logger.warn(`ESP32-CAM unreachable at ${url || config.esp32CamBaseUrl}`, {
      error: (err as Error).message,
    });
    throw new Error(`Camera offline: ${(err as Error).message}`);
  }
}

/**
 * Check camera health by attempting a HEAD or GET to /capture.
 */
export async function checkCameraHealth(): Promise<boolean> {
  try {
    const url = await getCameraUrl('/capture');
    await axios.get(url, {
      timeout: config.esp32TimeoutMs,
      responseType: 'arraybuffer',
    });
    cameraOnline = true;
    cameraLastSeen = new Date();
    return true;
  } catch {
    cameraOnline = false;
    return false;
  }
}

export function getCameraStatus() {
  return {
    online: cameraOnline,
    ip: 'See Settings',
    captureUrl: `/api/camera/capture`,
    lastSeen: cameraLastSeen ? cameraLastSeen.toISOString() : null,
  };
}

export async function toggleCameraLight(isOn: boolean): Promise<boolean> {
  try {
    const endpoint = isOn ? '/light/on' : '/light/off';
    const url = await getCameraUrl(endpoint);
    await axios.get(url, { timeout: config.esp32TimeoutMs });
    return true;
  } catch (err) {
    logger.error(`Failed to toggle camera light`, { error: (err as Error).message });
    return false;
  }
}

export async function setCameraResolution(isHigh: boolean): Promise<boolean> {
  try {
    const endpoint = isHigh ? '/resolution/high' : '/resolution/low';
    const url = await getCameraUrl(endpoint);
    await axios.get(url, { timeout: config.esp32TimeoutMs });
    return true;
  } catch (err) {
    logger.error(`Failed to set camera resolution`, { error: (err as Error).message });
    return false;
  }
}
