import React from 'react';
import { BrainCircuit, RefreshCw } from 'lucide-react';
import { useSensors, useAIRecommendation } from '../hooks';
import { useLanguage } from '../i18n';
import { AIRecommendationPanel } from '../components/AIRecommendationPanel';
import { Language } from '../types';

export function AIAssistantPage() {
  const { t, language } = useLanguage();
  const { data: sensors } = useSensors(5000);
  const { recommendation, loading, error, getRecommendation } = useAIRecommendation();

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          <BrainCircuit size={24} color="var(--accent-green)" />
          {t.aiAssistant}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          AI-powered farming recommendations based on your real-time sensor data
        </p>
      </div>

      {/* Current sensor context */}
      {sensors && (
        <div className="card fade-in" style={{ marginBottom: 16 }}>
          <div className="card-header"><span className="card-title">Current Sensor Context</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: t.soilMoisture, value: `${sensors.soilAverage?.toFixed(1) ?? '--'}%` },
              { label: t.temperature, value: `${sensors.temperature?.toFixed(1) ?? '--'}°C` },
              { label: t.humidity, value: `${sensors.humidity?.toFixed(1) ?? '--'}%` },
              { label: t.waterLevel, value: `${sensors.waterLevel?.toFixed(1) ?? '--'}%` },
              { label: t.light, value: `${sensors.light?.toFixed(0) ?? '--'} ADC` },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'Outfit, sans-serif' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIRecommendationPanel
        recommendation={recommendation}
        loading={loading}
        error={error}
        sensorData={sensors}
        onFetch={(data, lang) => getRecommendation(data, lang as Language)}
      />
    </div>
  );
}
