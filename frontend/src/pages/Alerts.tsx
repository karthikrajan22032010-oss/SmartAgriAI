import React from 'react';
import { Bell, CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { useAlerts } from '../hooks';
import { useLanguage } from '../i18n';
import { Alert } from '../types';

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'CRITICAL': return <AlertOctagon size={16} color="var(--accent-red)" />;
    case 'WARNING': return <AlertTriangle size={16} color="var(--accent-yellow)" />;
    default: return <Info size={16} color="var(--accent-blue)" />;
  }
};

export function AlertsPage() {
  const { t } = useLanguage();
  const { alerts, loading, resolve, refetch } = useAlerts();

  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            <Bell size={24} color={activeAlerts.length > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)'} />
            {t.allAlerts}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {activeAlerts.length} {t.activeAlerts.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card fade-in" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">{t.activeAlerts}</span>
          {activeAlerts.length > 0 && (
            <span className="badge badge-yellow">{activeAlerts.length}</span>
          )}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 60 }} />
        ) : activeAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>{t.noAlerts}</div>
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.severity}`}>
              <SeverityIcon severity={alert.severity} />
              <div style={{ flex: 1 }}>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-time" style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-red' : alert.severity === 'WARNING' ? 'badge-yellow' : 'badge-blue'}`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => resolve(alert.id)}>
                <CheckCircle size={12} />
                {t.resolveAlert}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div className="card fade-in">
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--text-muted)' }}>Resolved</span>
          </div>
          {resolvedAlerts.slice(0, 10).map(alert => (
            <div key={alert.id} className="alert-item" style={{ opacity: 0.5 }}>
              <CheckCircle size={16} color="var(--accent-green)" />
              <div style={{ flex: 1 }}>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-time">{new Date(alert.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
