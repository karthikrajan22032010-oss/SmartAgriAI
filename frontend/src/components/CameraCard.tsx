import React, { useState } from 'react';
import { Camera, RefreshCw, WifiOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { useLanguage } from '../i18n';
import { useCamera } from '../hooks';
import * as api from '../services/api';

export function CameraCard() {
  const { t } = useLanguage();
  const { imageUrl, refresh, autoRefresh, setAutoRefresh } = useCamera(10000);
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleRefresh = () => {
    setHasError(false);
    setLoaded(false);
    refresh();
  };

  const [lightOn, setLightOn] = useState(false);
  const [highRes, setHighRes] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const toggleLight = async () => {
    try {
      const newState = !lightOn;
      await api.toggleCameraLight(newState);
      setLightOn(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleResolution = async () => {
    try {
      const newState = !highRes;
      await api.setCameraResolution(newState);
      setHighRes(newState);
      handleRefresh(); // reload image with new res
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCamera = () => {
    const newState = !cameraActive;
    setCameraActive(newState);
    setAutoRefresh(newState);
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <Camera size={18} color="var(--accent-green)" />
        <span className="card-title">{t.cameraFeed}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-icon" onClick={toggleCamera} title="Camera Power" style={{ color: cameraActive ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            <Camera size={14} />
          </button>
          <button className="btn-icon" onClick={toggleLight} title="Flashlight" style={{ color: lightOn ? '#f59e0b' : 'var(--text-muted)' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>☼</span>
          </button>
          <button className="btn-icon" onClick={toggleResolution} title="Resolution (HQ/LQ)" style={{ color: highRes ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{highRes ? 'HQ' : 'LQ'}</span>
          </button>
          <button
            className="btn-icon"
            onClick={() => { if(cameraActive) setAutoRefresh(!autoRefresh); }}
            title={t.autoRefresh}
            style={{ color: autoRefresh ? 'var(--accent-green)' : undefined, opacity: cameraActive ? 1 : 0.5 }}
            disabled={!cameraActive}
          >
            {autoRefresh ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
          <button className="btn-icon" onClick={handleRefresh} title={t.refreshCamera} disabled={!cameraActive}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span className={`dot ${hasError || !cameraActive ? 'dot-red' : 'dot-green'}`} />
        <span>ESP32-CAM: 192.168.100.94</span>
        {autoRefresh && <span style={{ color: 'var(--accent-green)' }}>· {t.autoRefresh}</span>}
      </div>

      <div className="camera-container">
        {!cameraActive ? (
           <div className="camera-offline">
             <Camera size={32} color="var(--text-muted)" />
             <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Camera Feed Paused</span>
           </div>
        ) : !hasError ? (
          <>
            {!loaded && (
              <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt="ESP32-CAM Feed"
              className="camera-img"
              onLoad={() => setLoaded(true)}
              onError={() => { setHasError(true); setLoaded(true); }}
              style={{ display: loaded ? 'block' : 'none' }}
            />
          </>
        ) : (
          <div className="camera-offline">
            <WifiOff size={32} color="var(--text-muted)" />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t.cameraOffline}</span>
            <span style={{ fontSize: '0.72rem' }}>{t.cameraOfflineDesc}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleRefresh}>
              <RefreshCw size={12} />
              {t.refreshCamera}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
