import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { getAuditLogs } from '../api/auditLogs';

const ACTION_VARIANT = {
  created:            'green',
  updated:            'blue',
  deleted:            'red',
  promoted:           'blue',
  status_changed:     'orange',
  session_recorded:   'blue',
  attendance_opened:  'green',
  attendance_closed:  'gray',
};

const ENTITIES = ['student', 'payment', 'session', 'teacher'];
const ACTIONS  = ['created', 'updated', 'deleted', 'promoted', 'status_changed', 'session_recorded', 'attendance_opened', 'attendance_closed'];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditLog() {
  const { t } = useTranslation();

  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [expandedId,   setExpandedId]   = useState(null);

  useEffect(() => {
    setPage(1);
  }, [filterEntity, filterAction, filterFrom, filterTo]);

  useEffect(() => {
    load();
  }, [page, filterEntity, filterAction, filterFrom, filterTo]);

  async function load() {
    setLoading(true);
    try {
      const params = { page };
      if (filterEntity) params.entity = filterEntity;
      if (filterAction) params.action = filterAction;
      if (filterFrom)   params.from   = filterFrom;
      if (filterTo)     params.to     = filterTo;
      const res = await getAuditLogs(params);
      setRows(res.data.rows  || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function detailText(details) {
    if (!details) return null;
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('audit.title')}</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {total} {t('audit.entries')}
          </span>
        </div>

        {/* Filters */}
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <select
            className="form-input"
            style={{ width: 160 }}
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
          >
            <option value="">{t('audit.all_entities')}</option>
            {ENTITIES.map(e => (
              <option key={e} value={e}>{t(`audit.entity_${e}`)}</option>
            ))}
          </select>

          <select
            className="form-input"
            style={{ width: 180 }}
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
          >
            <option value="">{t('audit.all_actions')}</option>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{t(`audit.action_${a}`)}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-input"
            style={{ width: 148 }}
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="form-input"
            style={{ width: 148 }}
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            placeholder="To"
          />
          {(filterEntity || filterAction || filterFrom || filterTo) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterEntity(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); }}
            >
              {t('common.filter')} ×
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">{t('audit.title')}</span>
            <Badge variant="blue">{total}</Badge>
          </div>

          {loading ? (
            <div className="table-empty">{t('common.loading')}</div>
          ) : rows.length === 0 ? (
            <div className="table-empty">{t('common.no_data')}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('audit.col_date')}</th>
                  <th>{t('audit.col_actor')}</th>
                  <th>{t('audit.col_action')}</th>
                  <th>{t('audit.col_entity')}</th>
                  <th>{t('audit.col_details')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <React.Fragment key={row.id}>
                    <tr
                      style={{ cursor: row.details ? 'pointer' : 'default' }}
                      onClick={() => row.details && setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(row.created_at)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {row.user_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <Badge variant={ACTION_VARIANT[row.action] || 'gray'}>
                          {t(`audit.action_${row.action}`, { defaultValue: row.action })}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {t(`audit.entity_${row.entity}`, { defaultValue: row.entity })}
                        </span>
                        {row.entity_id && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> #{row.entity_id}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.details ? (
                          <span className="audit-details-preview">{detailText(row.details)}</span>
                        ) : '—'}
                      </td>
                    </tr>
                    {expandedId === row.id && row.details && (
                      <tr className="audit-expanded">
                        <td colSpan={5}>
                          <div className="audit-details-box">
                            {Object.entries(row.details).map(([k, v]) => (
                              <span key={k} className="audit-detail-chip">
                                <strong>{k}</strong>: {String(v)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="audit-pagination">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← {t('audit.prev')}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {page} / {pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              {t('audit.next')} →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
