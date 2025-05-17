import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import TableRow from '../components/TableRow';
import { useToast } from '../context/ToastContext';
import { DollarSign, Check, Download } from '../components/Icons';
import { getPayroll, getPayrollTeacher, markPaid, markUnpaid } from '../api/payroll';
import { exportPayrollPdf } from '../api/export';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();

  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [panelOpen, setPanelOpen] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { load(); }, [month]);

  async function load() {
    setLoading(true);
    try {
      const res = await getPayroll({ month });
      setRows(res.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(row) {
    setPanelOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getPayrollTeacher(row.teacher_id, { month });
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function togglePaid() {
    if (!detail) return;
    try {
      if (detail.is_paid) {
        await markUnpaid(detail.teacher.id, month);
      } else {
        await markPaid(detail.teacher.id, month);
      }
      const detailRes = await getPayrollTeacher(detail.teacher.id, { month });
      setDetail(detailRes.data);
      load();
      success(detail.is_paid ? t('payroll.mark_unpaid') + ' ✓' : t('payroll.mark_paid') + ' ✓');
    } catch { toastError(t('common.error')); }
  }

  const totalEarnings = rows.reduce((s, r) => s + (r.total_earnings || 0), 0);
  const totalSessions = rows.reduce((s, r) => s + (r.total_sessions || 0), 0);
  const paidCount = rows.filter(r => r.is_paid).length;

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('payroll.title')}</span>
          </div>
        </div>

        {/* Month selector + summary */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            type="month"
            className="form-input"
            style={{ width: 180 }}
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
          <div className="payroll-summary-pills">
            <span className="payroll-pill">
              <DollarSign size={14} />
              {totalEarnings.toFixed(0)} DA
            </span>
            <span className="payroll-pill">
              {totalSessions} {t('payroll.total_sessions')}
            </span>
            <span className="payroll-pill payroll-pill--green">
              {paidCount}/{rows.length} {t('payroll.paid_label')}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">{t('payroll.title')}</span>
          </div>
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('common.no_data')} sub={t('payroll.title')} />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('teachers.name')}</th>
                  <th>{t('payroll.sessions_taught')}</th>
                  <th>{t('payroll.total_earned')}</th>
                  <th>{t('payroll.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <TableRow key={row.teacher_id} index={idx} onClick={() => openDetail(row)}>
                    <td style={{ fontWeight: 500 }}>{row.teacher_name}</td>
                    <td>{row.total_sessions}</td>
                    <td style={{ fontWeight: 600 }}>{(row.total_earnings || 0).toFixed(0)} DA</td>
                    <td>
                      <Badge variant={row.is_paid ? 'green' : 'orange'}>
                        {row.is_paid ? t('payroll.status_paid') : t('payroll.status_pending')}
                      </Badge>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => exportPayrollPdf(row.teacher_id, month)}
                        title={t('common.download_receipt')}>
                        <Download size={14} />
                      </button>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <DetailPanel
        open={panelOpen}
        onToggle={() => setPanelOpen(v => !v)}
        title={t('payroll.title')}
        placeholder={
          <div className="panel-placeholder">
            <div className="panel-placeholder-icon"><DollarSign size={36} color="var(--text-light)" /></div>
            <p className="panel-placeholder-hint">{t('common.click_row_hint')}</p>
            <div className="panel-section" style={{ marginTop: 16 }}>
              <div className="panel-section-title">Résumé — {month}</div>
              <div className="panel-row">
                <span className="panel-row-label">{t('payroll.total_sessions')}</span>
                <span className="panel-row-value">{totalSessions}</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">Total à payer</span>
                <span className="panel-row-value" style={{ fontWeight: 700 }}>{totalEarnings.toFixed(0)} DA</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('payroll.paid_label')}</span>
                <Badge variant="green">{paidCount}/{rows.length}</Badge>
              </div>
            </div>
          </div>
        }
      >
        {detailLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : detail ? (
          <>
            {/* Header summary */}
            <div className="panel-section">
              <div className="panel-row">
                <span className="panel-row-label">{t('payroll.month')}</span>
                <span className="panel-row-value">{detail.month}</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('payroll.sessions_taught')}</span>
                <span className="panel-row-value">{detail.total_sessions}</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('payroll.total_earned')}</span>
                <span className="panel-row-value" style={{ fontWeight: 700, fontSize: 16 }}>
                  {(detail.total_earnings || 0).toFixed(0)} DA
                </span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('payroll.status')}</span>
                <span className="panel-row-value">
                  <Badge variant={detail.is_paid ? 'green' : 'orange'}>
                    {detail.is_paid ? t('payroll.status_paid') : t('payroll.status_pending')}
                  </Badge>
                </span>
              </div>
              {detail.paid_at && (
                <div className="panel-row">
                  <span className="panel-row-label">{t('payroll.paid_at')}</span>
                  <span className="panel-row-value" style={{ fontSize: 12 }}>
                    {new Date(detail.paid_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Mark paid / unpaid + download */}
            <div className="panel-section" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={`btn ${detail.is_paid ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                onClick={togglePaid}
              >
                {detail.is_paid ? t('payroll.mark_unpaid') : (
                  <><Check size={14} /> {t('payroll.mark_paid')}</>
                )}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => exportPayrollPdf(detail.teacher.id, month)}
              >
                <Download size={14} /> {t('common.download_receipt')}
              </button>
            </div>

            {/* Payment list */}
            <div className="panel-section">
              <div className="panel-section-title">{t('payments.title')}</div>
              {detail.payments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('common.no_data')}</div>
              ) : (
                <div className="payroll-payment-list">
                  {detail.payments.map(p => (
                    <div key={p.id} className="payroll-payment-row">
                      <div className="payroll-payment-info">
                        <span className="payroll-payment-student">{p.student_name}</span>
                        <span className="payroll-payment-module">{p.module_name}</span>
                      </div>
                      <div className="payroll-payment-amount">
                        {(p.teacher_amount || 0).toFixed(0)} DA
                      </div>
                    </div>
                  ))}
                  <div className="payroll-payment-total">
                    <span>{t('payroll.total_earned')}</span>
                    <span>{(detail.total_earnings || 0).toFixed(0)} DA</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DetailPanel>
    </Layout>
  );
}
