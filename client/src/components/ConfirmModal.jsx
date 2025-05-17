import { useTranslation } from 'react-i18next';
import { X } from './Icons';

/**
 * Reusable confirmation modal.
 * Props:
 *   message      — string shown in the body
 *   onConfirm    — called when user confirms
 *   onCancel     — called when user cancels or clicks overlay
 *   variant      — 'danger' (default) | 'primary'
 *   confirmLabel — override the confirm button label (defaults to t('common.yes'))
 */
export default function ConfirmModal({ message, onConfirm, onCancel, variant = 'danger', confirmLabel }) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{t('common.confirm_delete')}</span>
          <button className="topbar-btn" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="confirm-modal-body">
          <p className="confirm-modal-msg">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button className={`btn btn-${variant}`} onClick={onConfirm}>
            {confirmLabel ?? t('common.yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
