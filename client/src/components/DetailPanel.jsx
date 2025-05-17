import { ChevronLeft, ChevronRight } from './Icons';

// Right-side detail panel with persistent toggle tab.
// Props:
//   open       — bool, controlled from outside
//   onToggle   — fn, called to open or close
//   title      — string, panel heading
//   children   — selected-item detail content
//   placeholder— JSX shown when no item is selected (panel still open)
export default function DetailPanel({ open, onToggle, onClose, title, children, placeholder }) {
  const toggle = onToggle || onClose;

  return (
    <>
      {/* Reopen tab — fixed to right edge, visible only when panel is closed */}
      {!open && (
        <button
          className="panel-reopen-tab"
          onClick={toggle}
          aria-label="Open panel"
          title={title}
        >
          <ChevronLeft size={14} />
        </button>
      )}

      <aside className={`detail-panel${open ? ' open' : ''}`}>
        <div className="panel-inner">
          <div className="panel-header">
            <span className="panel-title">{title}</span>
            <button
              className="panel-close"
              onClick={toggle}
              aria-label="Close panel"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {children || placeholder || null}
        </div>
      </aside>
    </>
  );
}
