import React from 'react';
import { CloudRain, CloudDrizzle, Sun, CloudLightning } from 'lucide-react';
import { useLanguage } from '../i18n';

interface RainCardProps {
  humidity: number | null;
  temperature?: number | null;
}

export function RainCard({ humidity, temperature }: RainCardProps) {
  const { t } = useLanguage();

  // Calculate rain probability based on relative humidity
  let rainProb = 15;
  let isEstimated = false;

  if (humidity !== null && !isNaN(humidity)) {
    if (humidity < 40) {
      rainProb = Math.max(5, Math.round(humidity * 0.35));
    } else if (humidity < 65) {
      rainProb = Math.round(20 + (humidity - 40) * 1.2);
    } else if (humidity < 80) {
      rainProb = Math.round(50 + (humidity - 65) * 1.8);
    } else {
      rainProb = Math.min(98, Math.round(77 + (humidity - 80) * 1.05));
    }
  } else {
    // If DHT sensor is pending calibration, baseline estimate
    rainProb = 20;
    isEstimated = true;
  }

  const isHigh = rainProb >= 70;
  const isModerate = rainProb >= 40 && rainProb < 70;

  const color = isHigh ? '#38bdf8' : isModerate ? '#f59e0b' : '#10b981';
  const Icon = isHigh ? (rainProb > 85 ? CloudLightning : CloudRain) : isModerate ? CloudDrizzle : Sun;
  const statusLabel = isHigh ? t.rainHigh : isModerate ? t.rainModerate : t.rainLow;
  const advisory = isHigh ? t.rainDelayIrrigation : t.rainNormalIrrigation;

  return (
    <div className="card fade-in" style={{
      border: isHigh ? '1px solid rgba(56, 189, 248, 0.4)' : undefined,
      boxShadow: isHigh ? '0 0 15px rgba(56, 189, 248, 0.15)' : undefined
    }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={18} color={color} />
          <span className="card-title">{t.rainProbability}</span>
        </div>
        {isHigh && (
          <span className="badge badge-blue" style={{ fontSize: '0.65rem', animation: 'pulse 2s infinite' }}>
            🌧️ Rain Alert
          </span>
        )}
      </div>

      <div className="sensor-value" style={{ backgroundImage: 'none', WebkitTextFillColor: color }}>
        {rainProb}
        <span className="sensor-unit">%</span>
        {isEstimated && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>(Est)</span>}
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${rainProb}%`,
            background: isHigh
              ? 'linear-gradient(90deg, #38bdf8, #60a5fa)'
              : isModerate
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #10b981, #34d399)',
          }}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <div className="sensor-status" style={{ color, fontWeight: 600 }}>
          {statusLabel}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {advisory}
        </div>
      </div>
    </div>
  );
}
