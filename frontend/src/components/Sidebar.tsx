import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Bell, Settings, BrainCircuit, Leaf } from 'lucide-react';
import { useLanguage } from '../i18n';
import { useAlerts } from '../hooks';

export function Sidebar() {
  const { t } = useLanguage();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  const navItems = [
    { to: '/', label: t.dashboard, icon: <LayoutDashboard size={18} /> },
    { to: '/ai', label: t.aiAssistant, icon: <BrainCircuit size={18} /> },
    { to: '/history', label: t.history, icon: <History size={18} /> },
    {
      to: '/alerts',
      label: t.alerts,
      icon: <Bell size={18} />,
      badge: activeAlertCount > 0 ? activeAlertCount : null,
    },
    { to: '/settings', label: t.settings, icon: <Settings size={18} /> },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== null && item.badge !== undefined && (
              <span style={{
                background: 'var(--accent-red)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '999px',
                padding: '1px 6px',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div className="sidebar-section" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <Leaf size={14} color="var(--accent-green)" />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>v1.0.0</span>
        </div>
      </div>
    </nav>
  );
}
