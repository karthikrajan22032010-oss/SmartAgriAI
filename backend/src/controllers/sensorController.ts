// ============================================================
// SENSOR CONTROLLER
// ============================================================

import { Request, Response } from 'express';
import { fetchSensorData } from '../services/esp32Service';
import { classifySoil, classifyTemperature, classifyHumidity, classifyLight, classifyWaterLevel } from '../services/irrigationService';
import { getHistoricalReadings, getLatestReading } from '../services/historyService';
import { logger } from '../utils/logger';
import { TimeRange } from '../types';

export async function getCurrentSensors(req: Request, res: Response): Promise<void> {
  try {
    const data = await fetchSensorData();
    res.json({
      success: true,
      data: {
        ...data,
        soilStatus: classifySoil(data.soilAverage),
        temperatureStatus: classifyTemperature(data.temperature),
        humidityStatus: classifyHumidity(data.humidity),
        lightStatus: classifyLight(data.light),
        waterStatus: classifyWaterLevel(data.waterLevel),
      },
    });
  } catch (err) {
    logger.error('getSensors error', { error: (err as Error).message });
    res.status(503).json({
      success: false,
      error: 'ESP32 is offline',
      message: (err as Error).message,
    });
  }
}

export async function getSensorHistory(req: Request, res: Response): Promise<void> {
  const range = (req.query.range as TimeRange) || '24h';
  const validRanges: TimeRange[] = ['1h', '6h', '24h', '7d', '30d'];

  if (!validRanges.includes(range)) {
    res.status(400).json({ success: false, error: 'Invalid range. Use: 1h, 6h, 24h, 7d, 30d' });
    return;
  }

  const readings = await getHistoricalReadings(range);
  res.json({ success: true, range, count: readings.length, data: readings });
}

export async function getLatestSensor(req: Request, res: Response): Promise<void> {
  const reading = await getLatestReading();
  if (!reading) {
    res.status(404).json({ success: false, error: 'No readings in database' });
    return;
  }
  res.json({ success: true, data: reading });
}

export async function ingestSensorData(req: Request, res: Response): Promise<void> {
  const { soil1, soil2, soilAverage, temperature, humidity, light, waterLevel, pump, mode } = req.body;

  try {
    const { recordIngestedReading } = await import('../services/historyService');
    const { getPendingCommand, clearPendingCommand } = await import('../services/esp32Service');

    const result = await recordIngestedReading({
      soil1: soil1 !== undefined ? Number(soil1) : null,
      soil2: soil2 !== undefined ? Number(soil2) : null,
      soilAverage: soilAverage !== undefined ? Number(soilAverage) : null,
      temperature: temperature !== undefined && !isNaN(temperature) ? Number(temperature) : null,
      humidity: humidity !== undefined && !isNaN(humidity) ? Number(humidity) : null,
      light: light !== undefined ? Number(light) : null,
      waterLevel: waterLevel !== undefined ? Number(waterLevel) : null,
      pump: Boolean(pump),
      mode: mode === 'MANUAL' ? 'MANUAL' : 'AUTO',
    });

    const cmd = getPendingCommand();
    if (cmd) {
      clearPendingCommand();
    }

    res.json({
      success: true,
      message: 'Sensor data ingested successfully',
      data: result,
      command: cmd || null,
    });
  } catch (err) {
    logger.error('Sensor ingestion error', { error: (err as Error).message });
    res.status(500).json({ success: false, error: 'Ingestion failed', message: (err as Error).message });
  }
}

