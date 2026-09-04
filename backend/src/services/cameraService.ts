// ============================================================
// CAMERA SERVICE — Proxies ESP32-CAM image capture requests
// ============================================================

import axios from 'axios';
import net from 'net';
import { exec } from 'child_process';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let cameraOnline = false;
let cameraLastSeen: Date | null = null;
let currentCameraIp = '192.168.100.94';

export async function getCameraIp(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'esp32_cam_ip' } });
    if (setting && setting.value) {
      currentCameraIp = setting.value;
      return setting.value;
    }
  } catch {
    // Ignore db error, use fallback
  }
  return currentCameraIp;
}

async function getCameraUrl(endpoint: string): Promise<string> {
  const ip = await getCameraIp();
  return `http://${ip}${endpoint}`;
}

function pingHost(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`ping -n 1 -w 800 ${ip}`, (err, stdout) => {
      if (err) return resolve(false);
      resolve(stdout.includes('TTL=') || stdout.includes('Reply from'));
    });
  });
}

function checkTcpPort(host: string, port = 80, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
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
    // If capture failed, check if camera is alive
    const ip = await getCameraIp();
    const isAlive = (await checkTcpPort(ip, 80, 1000)) || (await pingHost(ip));
    if (isAlive) {
      cameraOnline = true;
      cameraLastSeen = new Date();
    } else {
      cameraOnline = false;
    }
    logger.warn(`ESP32-CAM capture unreachable at ${url || config.esp32CamBaseUrl}`, {
      error: (err as Error).message,
    });
    throw new Error(`Camera capture offline: ${(err as Error).message}`);
  }
}

/**
 * Check camera health. Uses TCP port check and ICMP ping so live /stream won't block it.
 */
export async function checkCameraHealth(): Promise<boolean> {
  try {
    const ip = await getCameraIp();
    const isPortOpen = await checkTcpPort(ip, 80, 1000);
    if (isPortOpen) {
      cameraOnline = true;
      cameraLastSeen = new Date();
      return true;
    }

    const isPingable = await pingHost(ip);
    if (isPingable) {
      cameraOnline = true;
      cameraLastSeen = new Date();
      return true;
    }

    cameraOnline = false;
    return false;
  } catch {
    cameraOnline = false;
    return false;
  }
}

export function getCameraStatus() {
  return {
    online: cameraOnline,
    ip: currentCameraIp,
    captureUrl: `/api/camera/capture`,
    lastSeen: cameraLastSeen ? cameraLastSeen.toISOString() : null,
  };
}

export async function toggleCameraLight(isOn: boolean): Promise<boolean> {
  const ip = await getCameraIp();
  const endpoints = isOn 
    ? ['/light/on', '/light?state=on', '/light/toggle', '/flash', '/led'] 
    : ['/light/off', '/light?state=off', '/light/toggle', '/flash', '/led'];

  for (const endpoint of endpoints) {
    try {
      const url = `http://${ip}${endpoint}`;
      await axios.get(url, { timeout: 2000 });
      return true;
    } catch {
      // Try next endpoint
    }
  }

  // If direct HTTP failed because stream is active, send direct raw TCP command
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => {
      const path = isOn ? '/light/on' : '/light/off';
      socket.write(`GET ${path} HTTP/1.1\r\nHost: ${ip}\r\nConnection: close\r\n\r\n`);
      setTimeout(() => {
        socket.destroy();
        resolve(true);
      }, 300);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(80, ip);
  });
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

