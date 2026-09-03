import React from 'react';
import { Thermometer } from 'lucide-react';
import { useLanguage } from '../i18n';

interface TemperatureCardProps {
  value: number | null;
  status?: string;
}

function getTempColor(temp: number | null): string {
  if (temp === null) return 'var(--text-muted)';
  if (temp > 35) return 'var(--accent-red)';
  if (temp > 30) return 'var(--accent-yellow)';
  return 'var(--accent-green)';
}

export function TemperatureCard({ value, status }: TemperatureCardProps) {
  const { t } = useLanguage();
  const color = getTempColor(value);

  const statusLabel =
    status === 'HIGH' ? t.tempHigh :
    status === 'WARNING' ? t.tempWarning :
    t.tempNormal;

  return (
    <div className="card fade-in">
      <div className="card-header">
        <Thermometer size={18} color={color} />
        <span className="card-title">{t.temperature}</span>
      </div>
      <div className="sensor-value" style={{ backgroundImage: 'none', WebkitTextFillColor: color }}>
        {value !== null ? value.toFixed(1) : '--'}
        <span className="sensor-unit">°C</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${value !== null && value > 35 ? 'progress-red' : value !== null && value > 30 ? 'progress-yellow' : 'progress-green'}`}
          style={{ width: `${Math.min(((value ?? 0) / 50) * 100, 100)}%` }}
        />
      </div>
      <div className="sensor-status" style={{ color }}>{statusLabel}</div>
    </div>
  );
}
