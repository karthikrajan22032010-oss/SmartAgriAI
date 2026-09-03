import React from 'react';
import { Waves, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../i18n';

interface WaterLevelCardProps {
  value: number | null;
  status?: string;
}

export function WaterLevelCard({ value, status }: WaterLevelCardProps) {
  const { t } = useLanguage();

  const color =
    status === 'CRITICAL' ? 'var(--accent-red)' :
    status === 'LOW' ? 'var(--accent-yellow)' :
    'var(--accent-blue)';

  const statusLabel =
    status === 'CRITICAL' ? t.waterCritical :
    status === 'LOW' ? t.waterLow :
    t.waterSafe;

  return (
    <div className="card fade-in" style={{ borderColor: status === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
      <div className="card-header">
        <Waves size={18} color={color} />
        <span className="card-title">{t.waterLevel}</span>
        {status === 'CRITICAL' && (
          <AlertTriangle size={14} color="var(--accent-red)" style={{ marginLeft: 'auto' }} />
        )}
      </div>
      <div className="sensor-value" style={{ backgroundImage: 'none', WebkitTextFillColor: color }}>
        {value !== null ? value.toFixed(0) : '--'}
        <span className="sensor-unit">%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${status === 'CRITICAL' ? 'progress-red' : status === 'LOW' ? 'progress-yellow' : 'progress-green'}`}
          style={{ width: `${Math.min(value ?? 0, 100)}%` }}
        />
      </div>
      <div className="sensor-status" style={{ color }}>{statusLabel}</div>
      {status === 'CRITICAL' && (
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: 4, fontWeight: 600 }}>
          {t.criticalWaterWarning}
        </div>
      )}
    </div>
  );
}
