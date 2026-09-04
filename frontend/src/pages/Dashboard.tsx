import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useSensors, useDeviceStatus, useAlerts, useAIRecommendation } from '../hooks';
import { useLanguage } from '../i18n';
import { SoilCard } from '../components/SoilCard';
import { TemperatureCard } from '../components/TemperatureCard';
import { HumidityCard } from '../components/HumidityCard';
import { LightCard } from '../components/LightCard';
import { WaterLevelCard } from '../components/WaterLevelCard';
import { RainCard } from '../components/RainCard';
import { PumpCard } from '../components/PumpCard';
import { CameraCard } from '../components/CameraCard';
import { SystemStatus } from '../components/SystemStatus';
import { AIRecommendationPanel } from '../components/AIRecommendationPanel';
import { AlertsPanel } from '../components/AlertsPanel';
import { HistoryChart } from '../components/HistoryChart';
import { Language } from '../types';

export function Dashboard() {
  const { t, language } = useLanguage();
  const { data: sensors, loading, error, refetch } = useSensors(1200);
  const { status } = useDeviceStatus(4000);
  const { alerts, resolve } = useAlerts(15000);
  const { recommendation, loading: aiLoading, error: aiError, getRecommendation } = useAIRecommendation();

  return (
    <div className="page-content">
      {/* Demo Banner */}
      {sensors?.isDemo && (
        <div className="demo-banner">
          <span>⚠</span>
          <div>
            <strong>{t.demoMode}</strong>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.demoModeDesc}</div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && !sensors && (
        <div className="demo-banner" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}>
          <span>⚠</span>
          <span>{t.esp32Offline}: {error}</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={refetch}>
            <RefreshCw size={12} /> {t.refresh}
          </button>
        </div>
      )}

      {/* System Status */}
      <div className="dashboard-grid-full" style={{ marginBottom: 16 }}>
        <SystemStatus status={status} loading={!status} />
      </div>

      {/* Sensor Cards */}
      <div className="dashboard-grid">
        <SoilCard value={sensors?.soil1 ?? null} label={t.soilSensor1} />
        <SoilCard value={sensors?.soil2 ?? null} label={t.soilSensor2} />
        <SoilCard value={sensors?.soilAverage ?? null} label={t.averageSoil} />
        <TemperatureCard value={sensors?.temperature ?? null} status={sensors?.temperatureStatus} />
        <HumidityCard value={sensors?.humidity ?? null} status={sensors?.humidityStatus} />
        <LightCard value={sensors?.light ?? null} status={sensors?.lightStatus} />
        <WaterLevelCard value={sensors?.waterLevel ?? null} status={sensors?.waterStatus} />
        <RainCard humidity={sensors?.humidity ?? null} temperature={sensors?.temperature ?? null} />
      </div>

      {/* Pump + Camera */}
      <div className="dashboard-grid-wide">
        <PumpCard sensorData={sensors} onRefresh={refetch} />
        <CameraCard />
      </div>

      {/* AI Recommendations + Alerts */}
      <div className="dashboard-grid-wide">
        <AIRecommendationPanel
          recommendation={recommendation}
          loading={aiLoading}
          error={aiError}
          sensorData={sensors}
          onFetch={(data, lang) => getRecommendation(data, lang as Language)}
        />
        <AlertsPanel alerts={alerts} onResolve={resolve} maxItems={6} />
      </div>

      {/* History Chart */}
      <div className="dashboard-grid-full">
        <HistoryChart />
      </div>
    </div>
  );
}
