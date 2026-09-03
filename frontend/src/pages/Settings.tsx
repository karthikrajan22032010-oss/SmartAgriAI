import React, { useState, useEffect } from 'react';
import { Save, Settings } from 'lucide-react';
import { useLanguage } from '../i18n';
import { LanguageSelector } from '../components/LanguageSelector';
import { getSettings, updateSettings } from '../services/api';

export function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateSettings(settings);
    setSaving(false);
    if (ok) { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }
  };

  const settingGroups: {
    label: string;
    keys: { key: string; label: string; desc: string; type?: string }[];
  }[] = [
    {
      label: 'Irrigation Thresholds',
      keys: [
        { key: 'soil_pump_on_threshold', label: 'Soil Pump ON Threshold (%)', desc: 'Pump turns ON below this soil moisture %' },
        { key: 'soil_pump_off_threshold', label: 'Soil Pump OFF Threshold (%)', desc: 'Pump turns OFF above this soil moisture %' },
      ],
    },
    {
      label: 'Water Safety',
      keys: [
        { key: 'water_level_min_safe', label: 'Minimum Safe Water Level (%)', desc: 'Pump is blocked below this level' },
        { key: 'water_level_critical', label: 'Critical Water Level (%)', desc: 'Critical alert generated below this level' },
      ],
    },
    {
      label: 'Temperature',
      keys: [
        { key: 'temp_warning', label: 'Temperature Warning (°C)', desc: 'Warning generated above this temperature' },
        { key: 'temp_high', label: 'High Temperature (°C)', desc: 'Critical alert above this temperature' },
      ],
    },
    {
      label: 'LDR Light Sensor',
      keys: [
        { key: 'ldr_dark', label: 'LDR Dark Threshold (ADC)', desc: 'Values below this = DARK' },
        { key: 'ldr_bright', label: 'LDR Bright Threshold (ADC)', desc: 'Values above this = BRIGHT' },
      ],
    },
    {
      label: 'Device IP Configuration',
      keys: [
        { key: 'esp32_ip', label: 'ESP32 Main IP', desc: 'IP address of the main ESP32 controller (e.g., 192.168.150.103)', type: 'text' },
        { key: 'esp32_cam_ip', label: 'ESP32-CAM IP', desc: 'IP address of the camera module (e.g., 192.168.150.102)', type: 'text' },
      ],
    },
  ];

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          <Settings size={24} color="var(--accent-green)" />
          {t.settings}
        </h1>
      </div>

      {/* Language */}
      <div className="card fade-in" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">{t.language}</span></div>
        <LanguageSelector />
      </div>

      {/* System Settings */}
      {settingGroups.map(group => (
        <div key={group.label} className="card fade-in" style={{ marginBottom: 16 }}>
          <div className="card-header"><span className="card-title">{group.label}</span></div>
          {loading ? (
            <div className="skeleton" style={{ height: 80 }} />
          ) : (
            group.keys.map(({ key, label, desc, type = 'number' }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {label}
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{desc}</div>
                <input
                  type={type}
                  value={settings[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={type === 'text' ? '192.168.x.x' : ''}
                  style={{
                    width: '100%', maxWidth: 200, padding: '6px 12px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            ))
          )}
        </div>
      ))}

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : t.save}
        </button>
        {savedMsg && <span style={{ color: 'var(--accent-green)', fontSize: '0.85rem' }}>✓ {t.saved}</span>}
      </div>
    </div>
  );
}
