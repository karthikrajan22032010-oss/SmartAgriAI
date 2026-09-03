import React from 'react';
import { HistoryChart } from '../components/HistoryChart';
import { useLanguage } from '../i18n';
import { BarChart2 } from 'lucide-react';

export function HistoryPage() {
  const { t } = useLanguage();
  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          <BarChart2 size={24} color="var(--accent-green)" />
          {t.history}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Historical sensor readings from your smart farm
        </p>
      </div>
      <HistoryChart showTitle={false} />
    </div>
  );
}
