import React from 'react';
import { Wind } from 'lucide-react';
import { useLanguage } from '../i18n';

interface HumidityCardProps {
  value: number | null;
  status?: string;
}

export function HumidityCard({ value, status }: HumidityCardProps) {
  const { t } = useLanguage();

  const color =
    status === 'HIGH' ? 'var(--accent-yellow)' :
    status === 'LOW' ? 'var(--accent-orange)' :
    'var(--accent-teal)';

  const statusLabel =
    status === 'HIGH' ? t.highHumidity :
    status === 'LOW' ? t.lowHumidity :
    t.normalHumidity;

  return (
    <div className="card fade-in">
      <div className="card-header">
        <Wind size={18} color={color} />
        <span className="card-title">{t.humidity}</span>
      </div>
      <div className="sensor-value" style={{ backgroundImage: 'none', WebkitTextFillColor: color }}>
        {value !== null ? value.toFixed(1) : '--'}
        <span className="sensor-unit">%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${status === 'HIGH' ? 'progress-yellow' : status === 'LOW' ? 'progress-red' : 'progress-green'}`}
          style={{ width: `${Math.min(value ?? 0, 100)}%` }}
        />
      </div>
      <div className="sensor-status" style={{ color }}>{statusLabel}</div>
    </div>
  );
}
