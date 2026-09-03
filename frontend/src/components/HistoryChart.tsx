import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../i18n';
import { useHistory } from '../hooks';
import { TimeRange } from '../types';
import { BarChart2 } from 'lucide-react';

const CHART_COLORS = {
  soilAverage: '#22c55e',
  temperature: '#f97316',
  humidity: '#14b8a6',
  waterLevel: '#3b82f6',
  light: '#eab308',
};

function formatTimestamp(ts: string, range: TimeRange): string {
  const d = new Date(ts);
  if (range === '1h' || range === '6h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (range === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface HistoryChartProps {
  showTitle?: boolean;
}

export function HistoryChart({ showTitle = true }: HistoryChartProps) {
  const { t } = useLanguage();
  const [range, setRange] = useState<TimeRange>('24h');
  const [activeLines, setActiveLines] = useState({
    soilAverage: true,
    temperature: true,
    humidity: true,
    waterLevel: true,
    light: false,
  });

  const { data, loading, error } = useHistory(range);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '1h', label: t.oneHour },
    { key: '6h', label: t.sixHours },
    { key: '24h', label: t.twentyFourHours },
    { key: '7d', label: t.sevenDays },
    { key: '30d', label: t.thirtyDays },
  ];

  const chartData = data.map((r) => ({
    time: formatTimestamp(r.timestamp, range),
    soilAverage: r.soilAverage,
    temperature: r.temperature,
    humidity: r.humidity,
    waterLevel: r.waterLevel,
    light: r.light,
  }));

  const toggleLine = (key: keyof typeof activeLines) => {
    setActiveLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="card fade-in">
      {showTitle && (
        <div className="card-header">
          <BarChart2 size={18} color="var(--accent-green)" />
          <span className="card-title">{t.history}</span>
        </div>
      )}

      {/* Time range buttons */}
      <div className="time-range-btns">
        {ranges.map((r) => (
          <button
            key={r.key}
            className={`btn btn-sm ${range === r.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Line toggles */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(CHART_COLORS).map(([key, color]) => (
          <button
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999, fontSize: '0.72rem',
              border: `1px solid ${color}`,
              background: activeLines[key as keyof typeof activeLines] ? `${color}22` : 'transparent',
              color: activeLines[key as keyof typeof activeLines] ? color : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onClick={() => toggleLine(key as keyof typeof activeLines)}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {key === 'soilAverage' ? 'Soil' : key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 250 }} />
      ) : error || chartData.length === 0 ? (
        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t.noData}
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }}
                labelStyle={{ color: 'var(--text-primary)', marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />
              {activeLines.soilAverage && <Line type="monotone" dataKey="soilAverage" name="Soil %" stroke={CHART_COLORS.soilAverage} dot={false} strokeWidth={2} />}
              {activeLines.temperature && <Line type="monotone" dataKey="temperature" name="Temp °C" stroke={CHART_COLORS.temperature} dot={false} strokeWidth={2} />}
              {activeLines.humidity && <Line type="monotone" dataKey="humidity" name="Humidity %" stroke={CHART_COLORS.humidity} dot={false} strokeWidth={2} />}
              {activeLines.waterLevel && <Line type="monotone" dataKey="waterLevel" name="Water %" stroke={CHART_COLORS.waterLevel} dot={false} strokeWidth={2} />}
              {activeLines.light && <Line type="monotone" dataKey="light" name="Light" stroke={CHART_COLORS.light} dot={false} strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
