import React from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../i18n';
import { Alert } from '../types';

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve?: (id: string) => void;
  maxItems?: number;
  compact?: boolean;
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'CRITICAL': return <AlertOctagon size={16} color="var(--accent-red)" />;
    case 'WARNING': return <AlertTriangle size={16} color="var(--accent-yellow)" />;
    default: return <Info size={16} color="var(--accent-blue)" />;
  }
};

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AlertsPanel({ alerts, onResolve, maxItems = 10, compact = false }: AlertsPanelProps) {
  const { t } = useLanguage();
  const activeAlerts = alerts.filter(a => !a.resolved).slice(0, maxItems);

  return (
    <div className="card fade-in">
      <div className="card-header">
        <Bell size={18} color={activeAlerts.length > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)'} />
        <span className="card-title">{t.activeAlerts}</span>
        {activeAlerts.length > 0 && (
          <span className="badge badge-yellow" style={{ marginLeft: 'auto' }}>
            {activeAlerts.length}
          </span>
        )}
      </div>

      {activeAlerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
          <CheckCircle size={28} style={{ marginBottom: 6, opacity: 0.4 }} />
          <div style={{ fontSize: '0.85rem' }}>{t.noAlerts}</div>
        </div>
      ) : (
        activeAlerts.map((alert) => (
          <div key={alert.id} className={`alert-item ${alert.severity}`}>
            <SeverityIcon severity={alert.severity} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">{formatRelativeTime(alert.timestamp)}</div>
            </div>
            {onResolve && !compact && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0 }}
                onClick={() => onResolve(alert.id)}
              >
                <CheckCircle size={12} />
                {t.resolveAlert}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
