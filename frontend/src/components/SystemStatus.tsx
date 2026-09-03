import React from 'react';
import { Server, Camera, Database, BrainCircuit } from 'lucide-react';
import { useLanguage } from '../i18n';
import { DeviceStatus } from '../types';

interface SystemStatusProps {
  status: DeviceStatus | null;
  loading?: boolean;
}

export function SystemStatus({ status, loading }: SystemStatusProps) {
  const { t } = useLanguage();

  const items = [
    {
      label: 'ESP32',
      icon: <Server size={16} />,
      online: status?.esp32?.online ?? false,
      detail: status?.esp32?.ip,
    },
    {
      label: 'ESP32-CAM',
      icon: <Camera size={16} />,
      online: status?.camera?.online ?? false,
      detail: status?.camera?.ip,
    },
    {
      label: t.connected.split('/')[0],
      icon: <Database size={16} />,
      online: status?.database?.connected ?? false,
      detail: 'PostgreSQL',
    },
    {
      label: 'AI',
      icon: <BrainCircuit size={16} />,
      online: status?.ai?.available ?? false,
      detail: 'Gemini',
    },
  ];

  return (
    <div className="card fade-in">
      <div className="card-header">
        <span className="card-title">{t.systemStatus}</span>
        {status?.lastChecked && (
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {t.lastUpdated}: {new Date(status.lastChecked).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="status-grid">
        {items.map((item) => (
          <div key={item.label} className="status-item">
            <div style={{ color: item.online ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {item.icon}
            </div>
            <span className="status-label">{item.label}</span>
            <span className={`badge ${item.online ? 'badge-green' : 'badge-red'}`}>
              <span className={`dot ${item.online ? 'dot-green' : 'dot-red'}`} />
              {item.online ? t.online : t.offline}
            </span>
            {item.detail && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
