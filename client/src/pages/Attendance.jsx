import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import TableRow from '../components/TableRow';
import CameraScanner from '../components/CameraScanner';
import { QrCode } from '../components/Icons';
import { getSessions } from '../api/sessions';
import { getSessionAttendance, openAttendance, closeAttendance, scanQr, setAttendanceStatus } from '../api/attendance';

export default function Attendance() {
  const { t } = useTranslation();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(false);

  const [qrInput, setQrInput] = useState('');
  const [scanLog, setScanLog] = useState([]); // recent scan results shown as cards
  const [cameraMode, setCameraMode] = useState(false);
  const qrRef = useRef(null);
  const intervalRef = useRef(null);

  function weekStart(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().slice(0, 10);
  }

  // load sessions for the whole week containing the selected date
  useEffect(() => {
    getSessions({ week_start: weekStart(date) }).then(r => {
      const list = r.data || [];
      setSessions(list);
      setSessionId('');
      setSession(null);
      setRecords([]);
      setScanLog([]);
    }).catch(() => setSessions([]));
  }, [date]);

  // load attendance when session changes
  useEffect(() => {
    if (!sessionId) { setSession(null); setRecords([]); setScanLog([]); return; }
    setScanLog([]);
    loadAttendance();
  }, [sessionId]);

  // auto-refresh every 5s when window is open
  useEffect(() => {
    if (session?.attendance_open) {
      intervalRef.current = setInterval(loadAttendance, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [session?.attendance_open, sessionId]);

  async function loadAttendance() {
    if (!sessionId) return;
    setLoadingAtt(true);
    try {
      const res = await getSessionAttendance(sessionId);
      setSession(res.data.session || null);
      setRecords(res.data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingAtt(false);
    }
  }

  async function handleOpenWindow() {
    await openAttendance(sessionId);
    loadAttendance();
  }

  async function handleCloseWindow() {
    const res = await closeAttendance(sessionId);
    setRecords(res.data.records || []);
    setSession(prev => prev ? { ...prev, attendance_open: 0 } : null);
    setCameraMode(false);
  }

  // Central scan handler — called by text input OR camera
  async function processScan(value) {
    const code = value.trim();
    if (!code || !sessionId) return;
    try {
      const res = await scanQr(code, Number(sessionId));
      const { status, student } = res.data;
      pushLog({ status, name: student?.name });
      if (status === 'present') loadAttendance();
    } catch (err) {
      const msg = err.response?.data?.message || t('common.error');
      pushLog({ status: 'error', name: null, msg });
    }
  }

  function pushLog(entry) {
    setScanLog(prev => [{ ...entry, id: Date.now(), time: new Date() }, ...prev].slice(0, 10));
  }

  async function handleTextSubmit(e) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    await processScan(qrInput);
    setQrInput('');
    qrRef.current?.focus();
  }

  // Camera fires multiple times for the same QR — debounce with a ref set
  const recentScansRef = useRef(new Set());
  async function handleCameraScan(code) {
    if (recentScansRef.current.has(code)) return;
    recentScansRef.current.add(code);
    setTimeout(() => recentScansRef.current.delete(code), 3000);
    await processScan(code);
  }

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const rate    = records.length ? Math.round((present / records.length) * 100) : 0;
  const windowOpen = !!session?.attendance_open;

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('attendance.title')}</span>
          </div>
        </div>

        {/* ── Session selector ── */}
        <div className="filter-bar" style={{ marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>{t('attendance.select_date')}</label>
            <input
              type="date"
              className="form-input"
              style={{ width: 180 }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: 400 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>{t('attendance.select_session')}</label>
            <select
              className="form-input"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
            >
              <option value="">{t('attendance.select_session')}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.date} · {s.start_time?.slice(0, 5)} – {s.module_name || '?'} ({s.group_name || '?'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!sessionId ? (
          <div className="table-wrap">
            <div className="table-empty" style={{ padding: 60 }}>
              <QrCode size={40} color="var(--text-light)" />
              <p style={{ marginTop: 12 }}>{t('attendance.no_session')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats ── */}
            <div className="attendance-summary">
              <div className="att-count">
                <div className="att-count-value" style={{ color: 'var(--green)' }}>{present}</div>
                <div className="att-count-label">{t('attendance.present')}</div>
              </div>
              <div className="att-count">
                <div className="att-count-value" style={{ color: 'var(--red)' }}>{absent}</div>
                <div className="att-count-label">{t('attendance.absent')}</div>
              </div>
              <div className="att-count">
                <div className="att-count-value">{records.length}</div>
                <div className="att-count-label">{t('attendance.total')}</div>
              </div>
              <div className="att-count">
                <div className="att-count-value" style={{ color: 'var(--primary)' }}>{rate}%</div>
                <div className="att-count-label">{t('attendance.rate')}</div>
              </div>
            </div>

            {/* ── Window control ── */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              {windowOpen ? (
                <button className="btn btn-danger" onClick={handleCloseWindow}>
                  {t('attendance.close_window')}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleOpenWindow}>
                  {t('attendance.open_window')}
                </button>
              )}

              {windowOpen && <Badge variant="green">{t('attendance.window_open')}</Badge>}
              {!windowOpen && session && <Badge variant="gray">{t('attendance.window_closed')}</Badge>}
              {windowOpen && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('attendance.refreshing')}</span>
              )}
              {loadingAtt && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</span>
              )}
            </div>

            {/* ── Scanner (only when window is open) ── */}
            {windowOpen && (
              <div className="scanner-wrap">

                {/* Camera viewport */}
                {cameraMode && (
                  <div className="camera-area">
                    <CameraScanner onScan={handleCameraScan} active={cameraMode} />
                    <p className="camera-hint">{t('attendance.camera_hint')}</p>
                  </div>
                )}

                {/* Text / paste input row */}
                <form onSubmit={handleTextSubmit} className="scan-form">
                  <input
                    ref={qrRef}
                    className="form-input scan-input"
                    placeholder={t('attendance.scan_placeholder')}
                    value={qrInput}
                    onChange={e => setQrInput(e.target.value)}
                    autoFocus={!cameraMode}
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn-primary">
                    <QrCode size={16} /> {t('attendance.scan')}
                  </button>
                  <button
                    type="button"
                    className={`btn ${cameraMode ? 'btn-danger' : 'btn-outline'}`}
                    onClick={() => setCameraMode(m => !m)}
                  >
                    {cameraMode ? t('attendance.stop_camera') : t('attendance.start_camera')}
                  </button>
                </form>

                {/* Scan log — last scans shown as colored feedback cards */}
                {scanLog.length > 0 && (
                  <div className="scan-log">
                    {scanLog.map(entry => {
                      const variant =
                        entry.status === 'present'        ? 'ok' :
                        entry.status === 'already_scanned'? 'warn' : 'err';
                      return (
                        <div key={entry.id} className={`scan-card scan-card--${variant}`}>
                          <span className="scan-card-name">
                            {entry.name || t('attendance.unknown')}
                          </span>
                          <span className="scan-card-status">
                            {entry.status === 'present'
                              ? t('attendance.marked_present')
                              : entry.status === 'already_scanned'
                              ? t('attendance.already_scanned')
                              : (entry.msg || t('common.error'))}
                          </span>
                          <span className="scan-card-time">
                            {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Attendance table ── */}
            <div className="table-wrap">
              <div className="table-toolbar">
                <span className="table-title">{t('attendance.title')}</span>
              </div>
              {loadingAtt && records.length === 0 ? (
                <SkeletonTable rows={5} cols={3} />
              ) : records.length === 0 ? (
                <EmptyState title={t('common.no_data')} sub={t('sessions.not_yet')} />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{t('attendance.student')}</th>
                      <th>{t('attendance.status')}</th>
                      <th>{t('attendance.scanned_at')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, idx) => (
                      <TableRow key={r.id ?? r.student_id} index={idx}>
                        <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                        <td>
                          <button
                            className="badge-toggle"
                            data-variant={r.status === 'present' ? 'green' : 'red'}
                            title={r.status === 'present' ? t('attendance.absent') : t('attendance.present')}
                            onClick={async () => {
                              const next = r.status === 'present' ? 'absent' : 'present';
                              const res = await setAttendanceStatus(sessionId, r.student_id, next);
                              setRecords(res.data.records || []);
                            }}
                          >
                            {r.status === 'present' ? t('attendance.present') : t('attendance.absent')}
                          </button>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : '—'}
                        </td>
                      </TableRow>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
