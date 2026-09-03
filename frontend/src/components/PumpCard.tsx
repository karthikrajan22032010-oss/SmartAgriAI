import React, { useState } from 'react';
import { Power, Zap, Settings2, Loader } from 'lucide-react';
import { useLanguage } from '../i18n';
import { usePump } from '../hooks';
import { SensorData } from '../types';

interface PumpCardProps {
  sensorData: SensorData | null;
  onRefresh?: () => void;
}

export function PumpCard({ sensorData, onRefresh }: PumpCardProps) {
  const { t } = useLanguage();
  const pump = usePump();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isOn = sensorData?.pump ?? false;
  const mode = sensorData?.mode ?? 'AUTO';

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
    onRefresh?.();
  };

  const handlePumpOn = async () => {
    const ok = await pump.turnOn();
    if (ok) showSuccess(t.pumpOn);
  };

  const handlePumpOff = async () => {
    const ok = await pump.turnOff();
    if (ok) showSuccess(t.pumpOff);
  };

  const handleAutoMode = async () => {
    await pump.setAuto();
    showSuccess(t.autoMode);
  };

  const handleManualMode = async () => {
    await pump.setManual();
    showSuccess(t.manualMode);
  };

  return (
    <div className="card fade-in" style={{ borderColor: isOn ? 'rgba(34, 197, 94, 0.4)' : undefined }}>
      <div className="card-header">
        <Zap size={18} color={isOn ? 'var(--accent-green)' : 'var(--text-muted)'} />
        <span className="card-title">{t.pumpControl}</span>
        <span style={{ marginLeft: 'auto' }}>
          <span className={`badge ${isOn ? 'badge-green' : 'badge-gray'}`}>
            <span className={`dot ${isOn ? 'dot-green' : ''}`} />
            {isOn ? t.pumpOn : t.pumpOff}
          </span>
        </span>
      </div>

      {/* Pump toggle visual */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
        <div className={`pump-toggle ${isOn ? 'on' : 'off'}`}>
          <Power size={32} color={isOn ? 'var(--accent-green)' : 'var(--text-muted)'} />
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className={`btn btn-sm ${mode === 'AUTO' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={handleAutoMode}
          disabled={pump.loading}
        >
          <Settings2 size={14} />
          {t.autoMode}
        </button>
        <button
          className={`btn btn-sm ${mode === 'MANUAL' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={handleManualMode}
          disabled={pump.loading}
        >
          {t.manualMode}
        </button>
      </div>

      {/* Pump ON/OFF buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={handlePumpOn}
          disabled={pump.loading || isOn}
        >
          {pump.loading ? <Loader size={14} className="spin" /> : <Power size={14} />}
          {t.turnPumpOn}
        </button>
        <button
          className="btn btn-danger btn-sm"
          style={{ flex: 1 }}
          onClick={handlePumpOff}
          disabled={pump.loading || !isOn}
        >
          {t.turnPumpOff}
        </button>
      </div>

      {/* Messages */}
      {pump.error && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--accent-red)', textAlign: 'center' }}>
          {pump.error}
        </div>
      )}
      {successMsg && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--accent-green)', textAlign: 'center' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Water safety warning */}
      {sensorData?.waterStatus === 'CRITICAL' && (
        <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--accent-red)', textAlign: 'center', fontWeight: 600 }}>
          ⚠ {t.criticalWaterWarning}
        </div>
      )}
    </div>
  );
}
