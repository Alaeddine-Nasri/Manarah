import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Renders a QR code as a canvas element.
// size: pixel width/height of the canvas (default 160)
export default function QRImage({ value, size = 160 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [value, size]);

  if (!value) return null;
  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
