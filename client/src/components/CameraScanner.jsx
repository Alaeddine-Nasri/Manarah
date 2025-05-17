import { useEffect, useRef, useState } from 'react';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/minified/html5-qrcode.min.js';
const CONTAINER_ID = 'html5qr-scanner-container';

// Loads html5-qrcode from CDN once and caches on window
function loadScript() {
  return new Promise((resolve) => {
    if (window.Html5Qrcode) { resolve(); return; }
    const s = document.createElement('script');
    s.src = CDN_URL;
    s.onload = resolve;
    s.onerror = resolve; // fail silently — text input still works
    document.head.appendChild(s);
  });
}

export default function CameraScanner({ onScan, active }) {
  const [ready, setReady] = useState(!!window.Html5Qrcode);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (ready) return;
    loadScript().then(() => setReady(!!window.Html5Qrcode));
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (active) {
      const scanner = new window.Html5Qrcode(CONTAINER_ID, { verbose: false });
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          (text) => onScan(text),
          () => {} // suppress per-frame errors
        )
        .catch((err) => console.warn('Camera start failed:', err));
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [active, ready]);

  return <div id={CONTAINER_ID} className="camera-viewport" />;
}
