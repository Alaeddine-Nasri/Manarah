import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

function ScanFrame() {
  const c = { position: 'absolute', width: 24, height: 24 };
  const b = '3px solid #4f6ef7';
  return (
    <>
      <div style={{ ...c, top: 12, left: 12, borderTop: b, borderLeft: b, borderRadius: '4px 0 0 0' }} />
      <div style={{ ...c, top: 12, right: 12, borderTop: b, borderRight: b, borderRadius: '0 4px 0 0' }} />
      <div style={{ ...c, bottom: 12, left: 12, borderBottom: b, borderLeft: b, borderRadius: '0 0 0 4px' }} />
      <div style={{ ...c, bottom: 12, right: 12, borderBottom: b, borderRight: b, borderRadius: '0 0 4px 0' }} />
    </>
  );
}

export default function QRScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastCodeRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        video.play().then(() => { if (active) { setReady(true); tick(); } });
      })
      .catch(() => setError("Impossible d'accéder à la caméra. Vérifiez les permissions."));

    function tick() {
      if (!active || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data && code.data !== lastCodeRef.current) {
        lastCodeRef.current = code.data;
        onScan(code.data);
        setTimeout(() => { lastCodeRef.current = null; }, 3000);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      {error ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <span style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{error}</span>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: ready ? 1 : 0, transition: 'opacity .3s', display: 'block' }}
            playsInline muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 40px rgba(0,0,0,.35)' }} />
          <ScanFrame />
          <div style={{
            position: 'absolute', left: 12, right: 12, height: 2,
            background: 'linear-gradient(90deg, transparent, #4f6ef7, transparent)',
            animation: 'scan-line 2s ease-in-out infinite',
          }} />
        </>
      )}
      <style>{`
        @keyframes scan-line {
          0%   { top: 0;    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: calc(100% - 2px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
