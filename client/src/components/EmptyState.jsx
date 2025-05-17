// EmptyState: shows an SVG illustration + title + optional CTA
export default function EmptyState({ title, sub, action, onAction, icon }) {
  return (
    <div className="empty-state">
      {icon ?? <DefaultIllustration />}
      <p className="empty-state-title">{title}</p>
      {sub && <p className="empty-state-sub">{sub}</p>}
      {action && onAction && (
        <button className="btn btn-primary btn-sm" style={{ marginTop: 4 }} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function DefaultIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="16" width="56" height="40" rx="6" stroke="currentColor" strokeWidth="2" />
      <rect x="16" y="28" width="24" height="3" rx="1.5" fill="currentColor" />
      <rect x="16" y="35" width="16" height="3" rx="1.5" fill="currentColor" />
      <rect x="16" y="42" width="20" height="3" rx="1.5" fill="currentColor" />
      <circle cx="54" cy="54" r="11" fill="var(--border)" />
      <line x1="54" y1="50" x2="54" y2="54" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="57" x2="54" y2="58" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
