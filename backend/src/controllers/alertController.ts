// ============================================================
// ALERT CONTROLLER
// ============================================================

import { Request, Response } from 'express';
import { getAlerts, resolveAlert, createAlert } from '../services/alertService';

export async function listAlerts(req: Request, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string || '50', 10);
  const alerts = await getAlerts(limit);
  res.json({ success: true, count: alerts.length, data: alerts });
}

export async function resolveAlertById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const alertId = Array.isArray(id) ? id[0] : id;
  if (!alertId) {
    res.status(400).json({ success: false, error: 'Alert ID is required' });
    return;
  }
  const ok = await resolveAlert(alertId);
  if (ok) {
    res.json({ success: true, message: `Alert ${alertId} resolved` });
  } else {
    res.status(404).json({ success: false, error: 'Alert not found' });
  }
}
