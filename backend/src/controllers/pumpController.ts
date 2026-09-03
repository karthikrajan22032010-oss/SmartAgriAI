// ============================================================
// PUMP CONTROLLER — Safety-first pump control
// ============================================================

import { Request, Response } from 'express';
import { fetchSensorData, sendPumpOn, sendPumpOff, sendModeAuto, sendModeManual } from '../services/esp32Service';
import { evaluateIrrigation, getPumpState } from '../services/irrigationService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config';

const prisma = new PrismaClient();

async function logPumpEvent(state: boolean, reason: string, soilAverage?: number | null, waterLevel?: number | null) {
  try {
    const device = await prisma.device.findFirst({ where: { type: 'ESP32_MAIN' } });
    if (device) {
      await prisma.pumpEvent.create({
        data: { state, reason, soilAverage, waterLevel, deviceId: device.id },
      });
    }
  } catch (err) {
    logger.error('Failed to log pump event', { error: (err as Error).message });
  }
}

export async function turnPumpOn(req: Request, res: Response): Promise<void> {
  try {
    // Safety check: verify water level before allowing pump ON
    let waterLevel: number | null = null;
    let soilAverage: number | null = null;

    try {
      const data = await fetchSensorData();
      waterLevel = data.waterLevel;
      soilAverage = data.soilAverage;

      if (waterLevel !== null && waterLevel < config.waterLevelMinSafe) {
        res.status(400).json({
          success: false,
          error: 'SAFETY_BLOCK',
          message: `Cannot turn pump ON: water level (${waterLevel}%) is below safe threshold (${config.waterLevelMinSafe}%)`,
        });
        return;
      }
    } catch {
      // If sensor read fails, allow manual override but warn
      logger.warn('Could not verify water level for manual pump ON — proceeding with caution');
    }

    const ok = await sendPumpOn();
    if (ok) {
      await logPumpEvent(true, 'Manual pump ON via API', soilAverage, waterLevel);
      res.json({ success: true, message: 'Pump turned ON', pump: true });
    } else {
      res.status(503).json({ success: false, error: 'Failed to communicate with ESP32' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function turnPumpOff(req: Request, res: Response): Promise<void> {
  try {
    const ok = await sendPumpOff();
    if (ok) {
      await logPumpEvent(false, 'Manual pump OFF via API', null, null);
      res.json({ success: true, message: 'Pump turned OFF', pump: false });
    } else {
      res.status(503).json({ success: false, error: 'Failed to communicate with ESP32' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function setAutoMode(req: Request, res: Response): Promise<void> {
  const ok = await sendModeAuto();
  res.json({ success: ok, mode: 'AUTO', message: ok ? 'AUTO mode set' : 'Failed to reach ESP32' });
}

export async function setManualMode(req: Request, res: Response): Promise<void> {
  const ok = await sendModeManual();
  res.json({ success: ok, mode: 'MANUAL', message: ok ? 'MANUAL mode set' : 'Failed to reach ESP32' });
}

export async function getPumpStatus(req: Request, res: Response): Promise<void> {
  res.json({ success: true, pump: getPumpState() });
}
