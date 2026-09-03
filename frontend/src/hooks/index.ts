// ============================================================
// HOOKS — useSensors, useDeviceStatus, useAlerts, usePump
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { SensorData, DeviceStatus, Alert, AIRecommendation, SensorReading, TimeRange, Language } from '../types';

// ── useSensors ────────────────────────────────────────────
export function useSensors(pollIntervalMs = 3000) {
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const sensors = await api.getCurrentSensors();
      setData(sensors);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetch, pollIntervalMs]);

  return { data, loading, error, refetch: fetch };
}

// ── useDeviceStatus ───────────────────────────────────────
export function useDeviceStatus(pollIntervalMs = 10000) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const s = await api.getDeviceStatus();
      setStatus(s);
    } catch {
      // Keep last known status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetch, pollIntervalMs]);

  return { status, loading, refetch: fetch };
}

// ── useAlerts ─────────────────────────────────────────────
export function useAlerts(pollIntervalMs = 15000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const a = await api.getAlerts();
      setAlerts(a);
    } catch {
      // Keep last known
    } finally {
      setLoading(false);
    }
  }, []);

  const resolve = useCallback(async (id: string) => {
    const ok = await api.resolveAlert(id);
    if (ok) fetch();
    return ok;
  }, [fetch]);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetch, pollIntervalMs]);

  return { alerts, loading, refetch: fetch, resolve };
}

// ── usePump ───────────────────────────────────────────────
export function usePump() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const execute = async (action: () => Promise<{ success: boolean; message?: string }>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      if (!result.success) setError(result.message || 'Action failed');
      else setLastResult(result.message || 'Done');
      return result.success;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    lastResult,
    turnOn: () => execute(api.pumpOn),
    turnOff: () => execute(api.pumpOff),
    setAuto: () => execute(api.setAutoMode),
    setManual: () => execute(api.setManualMode),
  };
}

// ── useHistory ────────────────────────────────────────────
export function useHistory(range: TimeRange = '24h') {
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const readings = await api.getSensorHistory(range);
      setData(readings);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── useAIRecommendation ───────────────────────────────────
export function useAIRecommendation() {
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (sensorData: SensorData, language: Language = 'en') => {
    setLoading(true);
    setError(null);
    try {
      const rec = await api.getAIRecommendation(sensorData, language);
      setRecommendation(rec);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { recommendation, loading, error, getRecommendation: fetch };
}

// ── useCamera ─────────────────────────────────────────────
export function useCamera(autoRefreshMs = 10000) {
  const [cacheBust, setCacheBust] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(() => setCacheBust(Date.now()), []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(refresh, autoRefreshMs);
    return () => clearInterval(timer);
  }, [autoRefresh, autoRefreshMs, refresh]);

  return {
    imageUrl: api.getCameraUrl(cacheBust),
    refresh,
    autoRefresh,
    setAutoRefresh,
  };
}
