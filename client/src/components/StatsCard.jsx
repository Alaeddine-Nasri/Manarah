import { useEffect, useRef, useState } from 'react';

// Props: icon (ReactNode), label, value, sub, color ("blue"|"green"|"orange"|"red"|"yellow"|"purple"|"teal")
const colorMap = {
  blue:   { bg: 'var(--primary-soft)', color: 'var(--primary)' },
  green:  { bg: 'var(--green-soft)',   color: 'var(--green)' },
  orange: { bg: 'var(--orange-soft)',  color: 'var(--orange)' },
  red:    { bg: 'var(--red-soft)',     color: 'var(--red)' },
  yellow: { bg: 'var(--yellow-soft)',  color: 'var(--yellow)' },
  purple: { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
  teal:   { bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
};

function useCountUp(target, duration = 600) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const prevTarget = useRef(null);

  useEffect(() => {
    const numTarget = typeof target === 'number' ? target : parseFloat(target);
    if (!Number.isFinite(numTarget)) { setDisplay(target); return; }

    const from = prevTarget.current ?? 0;
    prevTarget.current = numTarget;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    function step(ts) {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(from + (numTarget - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

export default function StatsCard({ icon, label, value, sub, color = 'blue' }) {
  const { bg, color: iconColor } = colorMap[color] || colorMap.blue;
  const animated = useCountUp(value);
  const isNumeric = typeof value === 'number';

  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: bg, color: iconColor }}>
        {icon}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{isNumeric ? animated.toLocaleString() : value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
