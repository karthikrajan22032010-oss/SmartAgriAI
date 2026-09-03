import React from 'react';
import { BrainCircuit, ChevronRight, Loader, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../i18n';
import { AIRecommendation, SensorData, Language } from '../types';

interface AIRecommendationPanelProps {
  recommendation: AIRecommendation | null;
  loading: boolean;
  error: string | null;
  onFetch: (data: SensorData, lang: Language) => void;
  sensorData: SensorData | null;
}

const urgencyColorClass = (u: string) => {
  switch (u) {
    case 'CRITICAL': return 'urgency-CRITICAL';
    case 'HIGH': return 'urgency-HIGH';
    case 'MEDIUM': return 'urgency-MEDIUM';
    default: return 'urgency-LOW';
  }
};

export function AIRecommendationPanel({ recommendation, loading, error, onFetch, sensorData }: AIRecommendationPanelProps) {
  const { t, language } = useLanguage();

  const handleFetch = () => {
    if (sensorData) onFetch(sensorData, language as Language);
  };

  return (
    <div className="card fade-in" style={{ borderColor: 'rgba(34, 197, 94, 0.25)' }}>
      <div className="card-header">
        <BrainCircuit size={18} color="var(--accent-green)" />
        <span className="card-title">{t.aiRecommendations}</span>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={handleFetch}
          disabled={loading || !sensorData}
        >
          {loading ? <Loader size={14} /> : <RefreshCw size={14} />}
          {loading ? t.analyzing : t.getAIAdvice}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginBottom: 12, fontSize: '0.82rem', color: '#f87171' }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {recommendation ? (
        <div className="fade-in">
          {/* Urgency badge */}
          <div style={{ marginBottom: 12 }}>
            <span className={`ai-urgency-badge ${urgencyColorClass(recommendation.urgency)}`}>
              {t.urgency}: {
                recommendation.urgency === 'CRITICAL' ? t.urgencyCritical :
                recommendation.urgency === 'HIGH' ? t.urgencyHigh :
                recommendation.urgency === 'MEDIUM' ? t.urgencyMedium :
                t.urgencyLow
              }
            </span>
          </div>

          {/* Recommendation text */}
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.6 }}>
            {recommendation.recommendation}
          </div>

          {/* Reason */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            {recommendation.reason}
          </div>

          {/* Actions */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {t.actions}
            </div>
            {recommendation.actions.map((action, i) => (
              <div key={i} className="action-item">
                <ChevronRight size={14} color="var(--accent-green)" />
                {action}
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            <BrainCircuit size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: '0.85rem' }}>
              {sensorData ? t.getAIAdvice : t.esp32Offline}
            </div>
            {sensorData && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleFetch}>
                {t.getAIAdvice}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
