import React, { useState, useEffect } from 'react';
import { Camera, Sun, RefreshCw, Maximize2, Minimize2, Sparkles, Wifi, Settings, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n';
import * as api from '../services/api';

export function CameraCard() {
  const { t } = useLanguage();
  const [camIp, setCamIp] = useState(api.getCameraLocalIp());
  const [streamUrl, setStreamUrl] = useState(`http://${api.getCameraLocalIp()}/stream`);
  const [lightOn, setLightOn] = useState(false);
  const [isTogglingLight, setIsTogglingLight] = useState(false);
  const [isHD, setIsHD] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [showIpEdit, setShowIpEdit] = useState(false);
  const [tempIp, setTempIp] = useState(camIp);
  const [useCloudRelay, setUseCloudRelay] = useState(false);

  useEffect(() => {
    const current = api.getCameraLocalIp();
    setCamIp(current);
    setTempIp(current);
    if (!useCloudRelay) {
      setStreamUrl(`http://${current}/stream?t=${Date.now()}`);
    } else {
      setStreamUrl(api.getCameraUrl(Date.now()));
    }
  }, [useCloudRelay]);

  const restartCamera = () => {
    setHasError(false);
    if (useCloudRelay) {
      setStreamUrl(api.getCameraUrl(Date.now()));
    } else {
      setStreamUrl(`http://${camIp}/stream?t=${Date.now()}`);
    }
  };

  const handleSaveIp = () => {
    if (tempIp && tempIp.trim()) {
      const cleanIp = tempIp.trim();
      api.setCameraLocalIp(cleanIp);
      setCamIp(cleanIp);
      setShowIpEdit(false);
      setHasError(false);
      setStreamUrl(`http://${cleanIp}/stream?t=${Date.now()}`);
    }
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
    fetch(`http://${camIp}/save`, { mode: 'no-cors' }).catch(() => {});

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
      const directEndpoint = newState ? `http://${camIp}/light/on` : `http://${camIp}/light/off`;
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

  const handleImageError = () => {
    // If local stream fails (e.g. mixed content or wrong IP), try cloud snapshot relay
    if (!useCloudRelay) {
      console.warn("Direct stream failed, falling back to backend snapshot proxy");
      setUseCloudRelay(true);
    } else {
      setHasError(true);
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
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            📷 {t.cameraFeed}
          </h2>
          <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            {isHD ? '✨ HD Output' : 'SD'}
          </span>
          {useCloudRelay && (
            <span className="badge" style={{ fontSize: '0.65rem', background: '#0369a1', color: '#fff' }}>
              Cloud Relay
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowIpEdit(!showIpEdit)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem'
            }}
            title="Configure Camera IP"
          >
            <Wifi size={12} />
            <span>{camIp}</span>
          </button>
          <span id="cameraStatus" style={{ fontSize: '12px', color: hasError ? '#ef4444' : 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className={`dot ${hasError ? 'dot-red' : 'dot-green'}`} />
            {hasError ? 'Camera Offline' : 'ESP32-CAM Live'}
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

      {showIpEdit && (
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ESP32-CAM IP:</span>
          <input
            type="text"
            value={tempIp}
            onChange={(e) => setTempIp(e.target.value)}
            placeholder="192.168.100.94"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              width: '140px'
            }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSaveIp} style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
            Set IP
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setUseCloudRelay(!useCloudRelay);
              setHasError(false);
            }}
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          >
            {useCloudRelay ? 'Switch to Direct LAN' : 'Switch to Cloud Relay'}
          </button>
        </div>
      )}

      <div className="camera-container" style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#080d0a',
        borderRadius: '14px',
        minHeight: '240px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {hasError ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={36} color="#ef4444" />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Camera Feed Not Reachable</div>
            <div style={{ fontSize: '0.78rem', maxWidth: '380px', lineHeight: 1.4 }}>
              Make sure your ESP32-CAM is powered on and connected to Wi-Fi at IP <code>{camIp}</code>.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button className="btn btn-primary btn-sm" onClick={restartCamera}>
                <RefreshCw size={12} /> Retry Stream
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowIpEdit(true)}>
                Change IP
              </button>
            </div>
          </div>
        ) : (
          <img
            id="cameraStream"
            src={streamUrl}
            alt="ESP32-CAM Live Video"
            crossOrigin="anonymous"
            onError={handleImageError}
            style={{
              width: isExpanded ? '100%' : isHD ? '480px' : '320px',
              maxWidth: '100%',
              height: isExpanded ? '440px' : isHD ? '320px' : '240px',
              objectFit: 'cover',
              borderRadius: '14px',
              background: '#000',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              transition: 'all 0.3s ease'
            }}
          />
        )}

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
            backdropFilter: 'blur(4px)',
            zIndex: 10
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
