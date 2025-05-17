import { useEffect, useRef, useState } from 'react';

const STATUS_CONFIG = {
  present:        { label: 'Présent ✓',       color: '#10b981', bg: 'rgba(16,185,129,.12)' },
  already_scanned:{ label: 'Déjà scanné',      color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  session_closed: { label: 'Séance fermée',    color: '#6b7280', bg: 'rgba(107,114,128,.12)' },
  wrong_group:    { label: 'Mauvais groupe',   color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  info_only:      { label: 'Élève trouvé',     color: '#4f6ef7', bg: 'rgba(79,110,247,.12)' },
};

function Initials({ name }) {
  const letters = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}

const AUTO_CLOSE_MS = 10000;

export default function ScanPopup({ result, onClose }) {
  const [remaining, setRemaining] = useState(AUTO_CLOSE_MS);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  function startTimer() {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setRemaining(AUTO_CLOSE_MS);

    timerRef.current = setTimeout(onClose, AUTO_CLOSE_MS);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 200) { clearInterval(intervalRef.current); return 0; }
        return r - 200;
      });
    }, 200);
  }

  useEffect(() => {
    startTimer();
    return () => { clearTimeout(timerRef.current); clearInterval(intervalRef.current); };
  }, [result]);

  if (!result) return null;

  const { student, status, session } = result;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.info_only;
  const pct = (remaining / AUTO_CLOSE_MS) * 100;

  return (
    <div
      style={{
        position: 'fixed', bottom: 28, left: 228, zIndex: 3000,
        width: 340, borderRadius: 16,
        background: 'var(--surface, #1e2433)',
        border: '1px solid var(--border, rgba(255,255,255,.08))',
        boxShadow: '0 20px 60px rgba(0,0,0,.4)',
        overflow: 'hidden',
        animation: 'slide-up .3s ease',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* progress bar */}
      <div style={{ height: 3, background: 'var(--border, rgba(255,255,255,.08))' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: cfg.color,
          transition: 'width .2s linear',
        }} />
      </div>

      <div style={{ padding: '16px 18px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: cfg.bg, color: cfg.color,
            fontSize: 12, fontWeight: 600,
          }}>
            {cfg.label}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #9ca3af)', fontSize: 18, lineHeight: 1, padding: 2 }}
          >
            ✕
          </button>
        </div>

        {/* student info */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Initials name={student?.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text, #f1f5f9)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {student?.name}
            </div>
            {(student?.level_name || student?.year_name) && (
              <div style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', marginBottom: 2 }}>
                {[student.level_name, student.year_name, student.group_name].filter(Boolean).join(' › ')}
              </div>
            )}
            {student?.phone && (
              <div style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>{student.phone}</div>
            )}
          </div>
        </div>

        {/* session info if closed */}
        {session && status === 'session_closed' && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(107,114,128,.08)', fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
            Séance du {session.date} — {session.module_name || 'Module'} — présence fermée
          </div>
        )}

        {session && status === 'wrong_group' && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.08)', fontSize: 12, color: '#ef4444' }}>
            Cet élève n'appartient pas au groupe de cette séance.
          </div>
        )}

        {/* countdown hint */}
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted, #6b7280)', textAlign: 'right' }}>
          Fermeture dans {Math.ceil(remaining / 1000)}s
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
