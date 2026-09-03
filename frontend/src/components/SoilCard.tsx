import React from 'react';
import { Droplets } from 'lucide-react';
import { useLanguage } from '../i18n';

interface SoilCardProps {
  value: number | null;
  label: string;
  index?: number;
}

function getSoilColor(pct: number | null): string {
  if (pct === null) return 'var(--text-muted)';
  if (pct < 30) return 'var(--accent-red)';
  if (pct < 60) return 'var(--accent-yellow)';
  return 'var(--accent-green)';
}

function getSoilProgressClass(pct: number | null): string {
  if (pct === null) return '';
  if (pct < 30) return 'progress-red';
  if (pct < 60) return 'progress-yellow';
  return 'progress-green';
}

export function SoilCard({ value, label, index }: SoilCardProps) {
  const { t } = useLanguage();

  const status =
    value === null ? 'N/A' :
    value < 30 ? t.veryDry :
    value < 60 ? t.moderate :
    t.good;

  const color = getSoilColor(value);

  return (
    <div className="card fade-in">
      <div className="card-header">
        <Droplets size={18} color={color} />
        <span className="card-title">{label}</span>
      </div>
      <div className="sensor-value" style={{ backgroundImage: 'none', WebkitTextFillColor: color }}>
        {value !== null ? `${value.toFixed(0)}` : '--'}
        <span className="sensor-unit">%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${getSoilProgressClass(value)}`}
          style={{ width: `${Math.min(value ?? 0, 100)}%` }}
        />
      </div>
      <div className="sensor-status" style={{ color }}>
        {status}
      </div>
      {value !== null && value < 30 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {t.irrigationRecommended}
        </div>
      )}
    </div>
  );
}
