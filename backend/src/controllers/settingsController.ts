// ============================================================
// SETTINGS CONTROLLER
// ============================================================

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    res.json({ success: true, data: map });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const updates = req.body as Record<string, string>;

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ success: false, error: 'Invalid settings payload' });
    return;
  }

  try {
    const promises = Object.entries(updates).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await Promise.all(promises);
    logger.info('Settings updated', { keys: Object.keys(updates) });
    res.json({ success: true, message: 'Settings updated', updated: Object.keys(updates) });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
