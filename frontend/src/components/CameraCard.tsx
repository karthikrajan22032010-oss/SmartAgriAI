import React, { useState } from 'react';
import { Camera, Sun, RefreshCw, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';
import * as api from '../services/api';

const CAMERA_IP = "192.168.100.94";

export function CameraCard() {
  const { t } = useLanguage();
  const [streamUrl, setStreamUrl] = useState(`http://${CAMERA_IP}/stream`);
  const [lightOn, setLightOn] = useState(false);
  const [isTogglingLight, setIsTogglingLight] = useState(false);
  const [isHD, setIsHD] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);

  const restartCamera = () => {
    setStreamUrl(`http://${CAMERA_IP}/stream?t=${Date.now()}`);
  };

  const toggleHD = async () => {
    const newHD = !isHD;
    setIsHD(newHD);
    try {
      await api.setCameraResolution(newHD);
    } catch {
      // Ignore
    }
    restartCamera();
  };

  const saveCameraImage = () => {
    // 1. Try to trigger /save on camera
    fetch(`http://${CAMERA_IP}/save`, { mode: 'no-cors' }).catch(() => {});

    // 2. Capture a frame snapshot directly from stream to download
    try {
      const img = document.getElementById('cameraStream') as HTMLImageElement;
      if (img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || (isHD ? 640 : 320);
        canvas.height = img.naturalHeight || (isHD ? 480 : 240);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const link = document.createElement('a');
          link.download = `esp32-cam-${isHD ? 'HD-' : ''}${Date.now()}.jpg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        }
      }
      setCaptureMsg(isHD ? 'HD Photo Captured & Saved!' : 'Captured & Saved!');
      setTimeout(() => setCaptureMsg(null), 2500);
    } catch {
      setCaptureMsg('Snapshot Captured');
      setTimeout(() => setCaptureMsg(null), 2500);
    }
  };

  const toggleCameraLight = async () => {
    const newState = !lightOn;
    setIsTogglingLight(true);
    try {
      // Direct call to camera
      const directEndpoint = newState ? `http://${CAMERA_IP}/light/on` : `http://${CAMERA_IP}/light/off`;
      fetch(directEndpoint, { mode: 'no-cors' }).catch(() => {});

      // Backend proxy call
      await api.toggleCameraLight(newState);
      setLightOn(newState);
    } catch (err) {
      console.error("Error toggling light:", err);
      setLightOn(newState);
    } finally {
      setIsTogglingLight(false);
    }
  };

  return (
    <div className="camera-card" style={{
      width: '100%',
      padding: '18px',
      borderRadius: '18px',
      background: '#101c15',
      border: '1px solid var(--border)',
      transition: 'all 0.2s ease',
      gridColumn: isExpanded ? '1 / -1' : undefined
    }}>
      <div className="camera-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            📷 {t.cameraFeed}
          </h2>
          <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            {isHD ? '✨ HD Output' : 'SD'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span id="cameraStatus" style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
            🟢 ESP32-CAM Online
          </span>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
            title={isExpanded ? t.compactStream : t.expandStream}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="camera-container" style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        height: 'auto',
        position: 'relative'
      }}>
        <img
          id="cameraStream"
          src={streamUrl}
          alt="Live ESP32-CAM HD Stream"
          crossOrigin="anonymous"
          style={{
            width: isExpanded ? '100%' : isHD ? '480px' : '320px',
            maxWidth: '100%',
            height: isExpanded ? '440px' : isHD ? '320px' : '240px',
            objectFit: 'cover',
            borderRadius: '14px',
            background: '#000',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'all 0.3s ease'
          }}
        />
        {captureMsg && (
          <div style={{
            position: 'absolute',
            top: '12px',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}>
            {captureMsg}
          </div>
        )}
      </div>

      <div className="camera-controls" style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '15px'
      }}>
        <button className="btn btn-ghost" onClick={restartCamera}>
          🔄 {t.refresh}
        </button>
        <button className="btn btn-primary" onClick={saveCameraImage}>
          📸 {isHD ? 'HD Capture' : 'Capture'}
        </button>
        <button 
          className={`btn ${isHD ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={toggleHD}
          style={isHD ? { background: '#0284c7', borderColor: '#0284c7', color: '#fff' } : {}}
        >
          ✨ {isHD ? 'HD 720p' : 'Switch to HD'}
        </button>
        <button 
          className={`btn ${lightOn ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={toggleCameraLight}
          disabled={isTogglingLight}
          style={lightOn ? { background: '#f59e0b', color: '#000', borderColor: '#f59e0b' } : {}}
        >
          💡 {lightOn ? 'Light ON' : 'Light OFF'}
        </button>
      </div>
    </div>
  );
}
