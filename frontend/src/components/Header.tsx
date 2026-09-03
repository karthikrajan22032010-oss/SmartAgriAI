import React from 'react';
import { Leaf, Wifi } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../i18n';

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="header">
      <div className="header-logo">
        <Leaf size={22} color="var(--accent-green)" />
        <span>{t.appName.split(' ').slice(0, 2).join(' ')}</span>
        <span style={{ color: 'var(--accent-green)' }}>
          {t.appName.split(' ').slice(2).join(' ')}
        </span>
      </div>
      <div className="header-right">
        <LanguageSelector />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Wifi size={14} />
          <span>192.168.150.103</span>
        </div>
      </div>
    </header>
  );
}
