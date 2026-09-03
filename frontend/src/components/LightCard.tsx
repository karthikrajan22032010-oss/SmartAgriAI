import React from 'react';
import { Sun, Moon, CloudSun } from 'lucide-react';
import { useLanguage } from '../i18n';

interface LightCardProps {
  value: number | null;
  status?: string;
}

export function LightCard({ value, status }: LightCardProps) {
  const { t } = useLanguage();

  const color =
    status === 'DARK' ? 'var(--text-muted)' :
    status === 'BRIGHT' ? 'var(--accent-yellow)' :
    'var(--accent-green)';

  const icon =
    status === 'DARK' ? <Moon size={18} color={color} /> :
    status === 'BRIGHT' ? <Sun size={18} color={color} /> :
    <CloudSun size={18} color={color} />;

  const statusLabel =
    status === 'DARK' ? t.dark :
    status === 'BRIGHT' ? t.bright :
    t.normalLight;

  // Normalize ADC value to percentage for display (max ~4095 for 12-bit ADC)
  const pct = value !== null ? Math.min((value / 1024) * 100, 100) : 0;

  return (
    <div className="card fade-in">
      <div className="card-header">
        {icon}
        <span className="card-title">{t.light}</span>
      </div>
      <div className="sensor-value" style={{ backgroundImage: 'none', WebkitTextFillColor: color }}>
        {value !== null ? value.toFixed(0) : '--'}
        <span className="sensor-unit" style={{ fontSize: '0.7rem' }}>ADC</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${status === 'DARK' ? 'progress-red' : status === 'BRIGHT' ? 'progress-yellow' : 'progress-green'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="sensor-status" style={{ color }}>{statusLabel}</div>
    </div>
  );
}
