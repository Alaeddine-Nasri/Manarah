import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import { useToast } from '../context/ToastContext';
import { Plus, Calendar, Edit, Trash, X, ChevronLeft, ChevronRight } from '../components/Icons';
import { getSessions, createSession, updateSession, deleteSession } from '../api/sessions';
import { setAttendanceStatus } from '../api/attendance';
import ConfirmModal from '../components/ConfirmModal';
import { getTeachers } from '../api/teachers';
import { getLevels } from '../api/levels';
import api from '../api/axios';
import QRScanner from '../components/QRScanner';
import ScanPopup from '../components/ScanPopup';

// ── Constants ──────────────────────────────────────────────────────────
const HOUR_H = 64; // px per hour
const PALETTE = ['#4f6ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
const DAY_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const DAY_NAMES_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MINUTES = ['00','15','30','45'];
const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const HOURS_ARR = Array.from({ length: 24 }, (_, i) => i); // 00:00 – 23:00

// ── Helpers ────────────────────────────────────────────────────────────
function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function addMinutes(timeStr, mins) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function todayStr() { return localDateStr(new Date()); }
function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return localDateStr(d);
}
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function getWeekDays(dateStr) {
  const ws = weekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
}
function fmtShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-DZ', { day:'numeric', month:'short' });
}
const emptyForm = {
  teacher_id:'', module_id:'', group_id:'',
  date: todayStr(), start_time:'', end_time:'',
  type:'one_time', recurrence:'weekly',
  start_date: todayStr(), end_date:'', days_of_week:[],
};

// ── TimeSelect ─────────────────────────────────────────────────────────
function TimeSelect({ value, onChange }) {
  const [hh, mm] = (value || '08:00').split(':');
  const nearestMin = MINUTES.reduce((best, m) =>
    Math.abs(parseInt(m)-parseInt(mm||0)) < Math.abs(parseInt(best)-parseInt(mm||0)) ? m : best
  , '00');
  return (
    <div style={{ display:'flex', gap:4 }}>
      <select className="form-input" style={{ flex:1 }} value={hh||'08'}
        onChange={e => onChange(`${e.target.value}:${nearestMin}`)}>
        {HOURS_ARR.map(h => <option key={h} value={String(h).padStart(2,'0')}>{String(h).padStart(2,'0')}h</option>)}
      </select>
      <select className="form-input" style={{ flex:1 }} value={nearestMin}
        onChange={e => onChange(`${hh||'08'}:${e.target.value}`)}>
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

// ── MiniCalendar ───────────────────────────────────────────────────────
function MiniCalendar({ currentDate, sessionDates, onSelect }) {
  const today = todayStr();
  const [ym, setYm] = useState(() => {
    const d = new Date((currentDate || today) + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  useEffect(() => {
    const d = new Date((currentDate || today) + 'T00:00:00');
    setYm({ year: d.getFullYear(), month: d.getMonth() });
  }, [currentDate]);

  const firstDow = (new Date(ym.year, ym.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(ym.year, ym.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const cellDate = d => `${ym.year}-${String(ym.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <button className="mini-cal-nav"
          onClick={() => setYm(p => p.month===0 ? {year:p.year-1,month:11} : {...p,month:p.month-1})}>
          <ChevronLeft size={14} />
        </button>
        <span className="mini-cal-title">{MONTH_NAMES[ym.month]} {ym.year}</span>
        <button className="mini-cal-nav"
          onClick={() => setYm(p => p.month===11 ? {year:p.year+1,month:0} : {...p,month:p.month+1})}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="mini-cal-grid">
        {['L','M','M','J','V','S','D'].map((d,i) => <div key={i} className="mini-cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ds = cellDate(d);
          return (
            <button key={ds}
              className={`mini-cal-day${ds===today?' today':''}${ds===currentDate?' selected':''}`}
              onClick={() => onSelect(ds)}>
              {d}
              {sessionDates.has(ds) && <span className="mini-cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── NowIndicator ───────────────────────────────────────────────────────
function NowIndicator() {
  const [top, setTop] = useState(() => {
    const n = new Date();
    return ((n.getHours() * 60 + n.getMinutes()) / 60) * HOUR_H;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setTop(((n.getHours() * 60 + n.getMinutes()) / 60) * HOUR_H);
    }, 60000);
    return () => clearInterval(id);
  }, []);
  return <div className="cal-now-line" style={{ top }} />;
}

// ── Overlap layout ─────────────────────────────────────────────────────
// Returns each session with { session, col, cols } for side-by-side rendering
function layoutSessions(sessions) {
  // Sort by start time
  const sorted = [...sessions].sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time));
  const result = [];
  // groups of overlapping sessions
  const groups = [];
  let group = [];
  let groupEnd = 0;
  for (const s of sorted) {
    const start = timeToMin(s.start_time);
    const end   = timeToMin(s.end_time);
    if (group.length === 0 || start < groupEnd) {
      group.push(s);
      groupEnd = Math.max(groupEnd, end);
    } else {
      groups.push(group);
      group = [s];
      groupEnd = end;
    }
  }
  if (group.length) groups.push(group);
  for (const grp of groups) {
    const cols = grp.length;
    grp.forEach((s, i) => result.push({ session: s, col: i, cols }));
  }
  return result;
}

// ── CalendarGrid ───────────────────────────────────────────────────────
function CalendarGrid({ days, sessions, teachers, onSessionClick, onSlotClick, selected }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H;
  }, [days.length]);

  const colorMap = useMemo(() => {
    const m = {};
    teachers.forEach((t, i) => { m[t.id] = PALETTE[i % PALETTE.length]; });
    return m;
  }, [teachers]);

  const byDate = useMemo(() => {
    const m = {};
    sessions.forEach(s => { (m[s.date] = m[s.date] || []).push(s); });
    return m;
  }, [sessions]);

  const today = todayStr();
  const cols = days.length;

  function handleColClick(e, dateStr) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMin = Math.round((y / HOUR_H) * 4) * 15;
    const h = Math.min(23, Math.floor(rawMin / 60));
    const m = rawMin % 60;
    const start = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    onSlotClick(dateStr, start, addMinutes(start, 90));
  }

  return (
    <div className="cal-outer">
      {/* Sticky day headers */}
      <div className="cal-header-row" style={{ gridTemplateColumns: `56px repeat(${cols}, 1fr)` }}>
        <div className="cal-time-gutter" />
        {days.map(d => {
          const dow = (new Date(d + 'T00:00:00').getDay() + 6) % 7;
          const num = new Date(d + 'T00:00:00').getDate();
          return (
            <div key={d} className={`cal-day-header${d===today?' today':''}`}>
              <span className="cal-day-name">{DAY_SHORT[dow]}</span>
              <span className={`cal-day-num${d===today?' today':''}`}>{num}</span>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal-body" style={{ gridTemplateColumns: `56px repeat(${cols}, 1fr)` }}>
          {/* Time axis */}
          <div className="cal-time-axis">
            {HOURS_ARR.map(h => (
              <div key={h} className="cal-time-cell">
                {h > 0 && <span>{String(h).padStart(2,'0')}:00</span>}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => (
            <div key={d} className={`cal-day-col${d===today?' today':''}`}
              onClick={e => handleColClick(e, d)}>
              {/* Hour lines */}
              {HOURS_ARR.map(h => (
                <div key={h} className="cal-hour-line" style={{ top: h * HOUR_H }} />
              ))}
              {/* Now indicator */}
              {d === today && <NowIndicator />}
              {/* Sessions with overlap layout */}
              {layoutSessions(byDate[d] || []).map(({ session: s, col, cols }) => {
                const startMin = timeToMin(s.start_time);
                const endMin   = timeToMin(s.end_time);
                const top    = (startMin / 60) * HOUR_H;
                const height = Math.max(22, ((endMin - startMin) / 60) * HOUR_H);
                const color  = colorMap[s.teacher_id] || PALETTE[0];
                const isSel  = selected?.id === s.id;
                const pct    = 100 / cols;
                return (
                  <div key={s.id}
                    className={`cal-session${isSel?' selected':''}`}
                    style={{
                      top, height,
                      left: `calc(4px + ${col * pct}%)`,
                      right: `calc(4px + ${(cols - col - 1) * pct}%)`,
                      width: undefined,
                      background: hexToRgba(color, 0.14),
                      borderLeft: `3px solid ${color}`,
                      '--sess-color': color,
                      outline: isSel ? `2px solid ${color}` : 'none',
                      outlineOffset: 1,
                    }}
                    title={`${s.start_time?.slice(0,5)}–${s.end_time?.slice(0,5)} · ${s.module_name} · ${s.teacher_name}`}
                    onClick={e => { e.stopPropagation(); onSessionClick(s); }}>
                    <div className="cal-session-time">{s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div>
                    <div className="cal-session-title">{s.module_name || '—'}</div>
                    {height > 44 && <div className="cal-session-sub">{s.teacher_name}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sessions page ──────────────────────────────────────────────────────
export default function Sessions() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [sessions, setSessions]     = useState([]);
  const [teachers, setTeachers]     = useState([]);
  const [levels, setLevels]         = useState([]);
  const [modules, setModules]       = useState([]);
  const [loading, setLoading]       = useState(true);

  const [view, setView]             = useState('weekly');
  const [date, setDate]             = useState(todayStr());
  const [filterTeacher, setFilterTeacher] = useState('');

  const [selected, setSelected]     = useState(null);
  const [panelOpen, setPanelOpen]   = useState(true);
  const [scanSession, setScanSession]   = useState(null); // scanner open flag
  const [scanResult, setScanResult]     = useState(null); // last scan result for popup
  const [roster, setRoster]         = useState([]);
  const rosterIntervalRef           = useRef(null);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [deleteTarget, setDeleteTarget]       = useState(null);
  const [deleteRecurring, setDeleteRecurring] = useState(false);
  const [deleteSingleTarget, setDeleteSingleTarget] = useState(null);
  const [closeAttendTarget, setCloseAttendTarget]   = useState(null);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadSessions(); }, [view, date, filterTeacher]);

  useEffect(() => {
    clearInterval(rosterIntervalRef.current);
    if (!selected) { setRoster([]); return; }
    fetchRoster(selected.id);
    if (selected.attendance_open) {
      rosterIntervalRef.current = setInterval(() => fetchRoster(selected.id), 5000);
    }
    return () => clearInterval(rosterIntervalRef.current);
  }, [selected?.id, selected?.attendance_open]);

  async function fetchRoster(sessionId) {
    try {
      const res = await api.get(`/attendance/session/${sessionId}/roster`);
      setRoster(res.data.roster || []);
    } catch { setRoster([]); }
  }

  async function loadMeta() {
    try {
      const [tRes, lRes, mRes] = await Promise.all([getTeachers(), getLevels(), api.get('/modules')]);
      setTeachers(tRes.data || []);
      setLevels(lRes.data || []);
      setModules(mRes.data || []);
    } catch { /* ignore */ }
  }

  async function loadSessions() {
    setLoading(true);
    try {
      const params = filterTeacher ? { teacher_id: filterTeacher } : {};
      if (view === 'weekly') params.week_start = weekStart(date);
      else params.date = date;
      const res = await getSessions(params);
      setSessions(res.data || []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  }

  const allGroups = levels.flatMap(l =>
    l.years?.flatMap(y => y.groups?.map(g => ({ ...g, year_name: y.name, level_name: l.name })) || []) || []
  );

  const formModules = form.teacher_id
    ? (() => {
        const teacher = teachers.find(t => String(t.id) === String(form.teacher_id));
        if (!teacher?.assignments?.length) return modules;
        const ids = new Set(teacher.assignments.map(a => a.module_id));
        return modules.filter(m => ids.has(m.id));
      })()
    : modules;

  function openAdd() {
    setEditTarget(null);
    setForm({ ...emptyForm, date });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditTarget(s);
    setForm({
      teacher_id: String(s.teacher_id || ''),
      module_id: String(s.module_id || ''),
      group_id: String(s.group_id || ''),
      date: s.date || todayStr(),
      start_time: s.start_time || '',
      end_time: s.end_time || '',
      type: 'one_time', recurrence: 'weekly',
      start_date: todayStr(), end_date: '', days_of_week: [],
    });
    setFormError('');
    setModalOpen(true);
  }

  function openPanel(s) { setSelected(s); }


  async function handleScan(qrCode) {
    try {
      // No session_id — server auto-matches student to any open session
      const res = await api.post('/attendance/scan', { qr_code: qrCode });
      setScanResult(res.data);
      // Refresh roster if panel is open on the matched session
      if (res.data.status === 'present' && selected?.id === res.data.session?.id) {
        const r = await api.get(`/attendance/session/${res.data.session.id}/roster`);
        setRoster(r.data.roster || []);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erreur';
      setScanResult({ status: 'info_only', student: { name: msg } });
    }
  }

  function toggleDay(d) {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(d)
        ? prev.days_of_week.filter(x => x !== d)
        : [...prev.days_of_week, d],
    }));
  }

  async function handleSave() {
    const { teacher_id, module_id, group_id, start_time, end_time } = form;
    if (!teacher_id || !module_id || !group_id || !start_time || !end_time) {
      setFormError(t('common.error')); return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await updateSession(editTarget.id, {
          teacher_id: Number(form.teacher_id), module_id: Number(form.module_id),
          group_id: Number(form.group_id), date: form.date,
          start_time: form.start_time, end_time: form.end_time,
        });
      } else {
        const payload = {
          teacher_id: Number(form.teacher_id), module_id: Number(form.module_id),
          group_id: Number(form.group_id), start_time: form.start_time,
          end_time: form.end_time, type: form.type,
        };
        if (form.type === 'one_time') payload.date = form.date;
        else {
          payload.recurrence = form.recurrence;
          payload.start_date = form.start_date;
          payload.end_date   = form.end_date;
          payload.days_of_week = form.days_of_week;
        }
        await createSession(payload);
      }
      setModalOpen(false);
      success(editTarget ? t('common.saved') : t('sessions.add') + ' ✓');
      loadSessions();
    } catch {
      setFormError(t('common.error'));
      toastError(t('common.error'));
    } finally { setSaving(false); }
  }

  async function handleDelete(session, alsoRecurring = false) {
    try {
      await deleteSession(session.id, alsoRecurring);
      setDeleteTarget(null); setDeleteRecurring(false);
      if (selected?.id === session.id) setSelected(null);
      loadSessions();
    } catch { /* ignore */ }
  }

  function confirmDelete(session) {
    if (session.recurrence_group) { setDeleteTarget(session); setDeleteRecurring(true); }
    else setDeleteSingleTarget(session);
  }

  const typeVariant = s => s.type === 'recurring' ? 'blue' : 'gray';
  const attVariant  = s => s.attendance_open ? 'green' : 'gray';

  function studentStatus(record, session) {
    if (record.status === 'present') return { label: t('attendance.present'), variant: 'green' };
    if (record.status === 'absent')  return { label: t('attendance.absent'),  variant: 'red' };
    if (!session.attendance_open)    return { label: t('attendance.absent'),  variant: 'red' };
    const now = new Date();
    const [sh, sm] = (session.start_time || '00:00').split(':').map(Number);
    const start = new Date(now); start.setHours(sh, sm, 0, 0);
    if (now >= start) return { label: t('sessions.late'), variant: 'orange' };
    return { label: t('sessions.not_yet'), variant: 'yellow' };
  }

  const sessionDates = useMemo(() => new Set(sessions.map(s => s.date)), [sessions]);
  const openSessions = useMemo(() => sessions.filter(s => s.attendance_open), [sessions]);

  // Teacher color map for legend
  const colorMap = useMemo(() => {
    const m = {};
    teachers.forEach((t, i) => { m[t.id] = PALETTE[i % PALETTE.length]; });
    return m;
  }, [teachers]);

  const weekLabel = view === 'weekly'
    ? `${fmtShort(weekStart(date))} – ${fmtShort(addDays(weekStart(date), 6))}`
    : fmtShort(date);

  return (
    <>
    <Layout>
      <div className="page cal-page">
        {/* Header: main row + legend sub-row */}
        <div className="cal-header-bar">
          {/* Main row */}
          <div className="cal-header-main">
            <span className="cal-header-title">{t('sessions.title')}</span>

            <div className="view-toggle">
              <button className={`view-btn${view==='daily'?' active':''}`} onClick={() => setView('daily')}>
                {t('sessions.daily_view')}
              </button>
              <button className={`view-btn${view==='weekly'?' active':''}`} onClick={() => setView('weekly')}>
                {t('sessions.weekly_view')}
              </button>
            </div>

            <div className="cal-nav">
              <button className="btn btn-ghost btn-sm cal-nav-btn"
                onClick={() => setDate(addDays(date, view==='weekly' ? -7 : -1))}>
                <ChevronLeft size={16} />
              </button>
              <span className="cal-nav-label">{weekLabel}</span>
              <button className="btn btn-ghost btn-sm cal-nav-btn"
                onClick={() => setDate(addDays(date, view==='weekly' ? 7 : 1))}>
                <ChevronRight size={16} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:12, padding:'4px 10px' }}
                onClick={() => setDate(todayStr())}>
                Aujourd'hui
              </button>
            </div>

            <select className="form-input" style={{ width:150, height:32, padding:'0 8px', fontSize:13 }} value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}>
              <option value="">{t('sessions.filter_teacher')}</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <Plus size={14} /> {t('sessions.add')}
            </button>
          </div>

          {/* Legend sub-row */}
          {teachers.length > 0 && (
            <div className="cal-header-legend">
              {teachers.map((t, i) => (
                <button key={t.id}
                  className={`cal-legend-item${filterTeacher && String(filterTeacher) !== String(t.id) ? ' dimmed' : ''}`}
                  onClick={() => setFilterTeacher(f => String(f) === String(t.id) ? '' : String(t.id))}>
                  <span className="cal-legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="cal-legend-name">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="cal-loading"><div className="spinner" /></div>
        ) : (
          <CalendarGrid
            days={view === 'weekly' ? getWeekDays(date) : [date]}
            sessions={sessions}
            teachers={teachers}
            onSessionClick={openPanel}
            onSlotClick={(d, start, end) => {
              setEditTarget(null);
              setForm({ ...emptyForm, date: d, start_time: start, end_time: end });
              setFormError('');
              setModalOpen(true);
            }}
            selected={selected}
          />
        )}
      </div>

      {/* Detail panel */}
      <DetailPanel open={panelOpen} onToggle={() => setPanelOpen(v => !v)} title={t('sessions.title')}>
        {/* Flip card: front = mini calendar, back = QR scanner — fixed same height both sides */}
        <div className="flip-card" style={{ height: 295, margin: '0 -20px' }}>
          <div className="flip-card-inner" style={{ transform: scanSession ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            {/* Front: mini calendar */}
            <div className="flip-card-face flip-card-front">
              <MiniCalendar
                currentDate={date}
                sessionDates={sessionDates}
                onSelect={d => { setDate(d); }}
              />
              <div style={{ display:'flex', justifyContent:'flex-end', padding:'2px 10px 6px' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }}
                  onClick={() => setScanSession(true)}>
                  📷 Passer au scanner
                </button>
              </div>
            </div>
            {/* Back: QR scanner */}
            <div className="flip-card-face flip-card-back" style={{ display:'flex', flexDirection:'column' }}>
              <div style={{ flex:1, minHeight:0, padding:'10px 14px 0' }}>
                {scanSession && <QRScanner onScan={handleScan} />}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', padding:'4px 10px 4px', flexShrink:0 }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }}
                  onClick={() => setScanSession(null)}>
                  📅 Voir le calendrier
                </button>
              </div>
              {openSessions.length > 0 && (
                <div style={{ padding:'0 12px 8px', flexShrink:0 }}>
                  {openSessions.map(s => (
                    <div key={s.id} style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block', flexShrink:0 }} />
                      {s.module_name} · {s.group_name} · {s.start_time?.slice(0,5)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!selected ? (
          <div style={{ padding:'20px 16px', textAlign:'center' }}>
            <Calendar size={32} color="var(--text-light)" />
            <p className="panel-placeholder-hint" style={{ marginTop:8 }}>{t('common.click_row_hint')}</p>
            <div className="panel-section" style={{ marginTop:12, textAlign:'left' }}>
              <div className="panel-section-title">{weekLabel}</div>
              <div className="panel-row">
                <span className="panel-row-label">{t('sessions.title')}</span>
                <Badge variant="blue">{sessions.length}</Badge>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0 12px' }}>
              <div style={{
                width:44, height:44, borderRadius:'var(--r)',
                background: hexToRgba(colorMap[selected.teacher_id] || PALETTE[0], 0.15),
                border: `2px solid ${colorMap[selected.teacher_id] || PALETTE[0]}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Calendar size={20} color={colorMap[selected.teacher_id] || PALETTE[0]} />
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>{selected.module_name || '—'}</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>{selected.date}</div>
              </div>
            </div>

            <div className="panel-section">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button
                  className={`btn btn-sm ${selected.attendance_open ? 'btn-danger' : 'btn-primary'}`}
                  onClick={async () => {
                    if (selected.attendance_open) {
                      setCloseAttendTarget(selected);
                    } else {
                      const { openAttendance } = await import('../api/attendance');
                      await openAttendance(selected.id);
                      loadSessions();
                      setSelected(prev => prev ? { ...prev, attendance_open: 1 } : null);
                      setScanSession(true);
                    }
                  }}>
                  {selected.attendance_open ? t('sessions.close_attendance') : t('sessions.open_attendance')}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                  <Edit size={14} /> {t('common.edit')}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }}
                  onClick={() => confirmDelete(selected)}>
                  <Trash size={14} /> {t('common.delete')}
                </button>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-title">{t('sessions.details')}</div>
              {[
                { label: t('sessions.teacher'), value: selected.teacher_name, color: colorMap[selected.teacher_id] },
                { label: t('sessions.module'),  value: selected.module_name },
                { label: t('sessions.group'),   value: selected.group_name },
                { label: t('sessions.start_time'), value: selected.start_time?.slice(0,5) },
                { label: t('sessions.end_time'),   value: selected.end_time?.slice(0,5) },
              ].map(({ label, value, color }) => (
                <div key={label} className="panel-row">
                  <span className="panel-row-label">{label}</span>
                  <span className="panel-row-value" style={color ? { color, fontWeight:600 } : {}}>
                    {value || '—'}
                  </span>
                </div>
              ))}
              <div className="panel-row">
                <span className="panel-row-label">{t('sessions.type')}</span>
                <Badge variant={typeVariant(selected)}>
                  {selected.type === 'recurring' ? t('sessions.type_recurring') : t('sessions.type_one_time')}
                </Badge>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('attendance.title')}</span>
                <Badge variant={attVariant(selected)}>
                  {selected.attendance_open ? t('sessions.attendance_open') : t('sessions.attendance_closed')}
                </Badge>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{t('sessions.roster')} ({roster.length})</span>
                {selected.attendance_open && (
                  <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>{t('attendance.refreshing')}</span>
                )}
              </div>
              {roster.length === 0 ? (
                <div style={{ fontSize:13, color:'var(--text-muted)', padding:'8px 0' }}>{t('common.no_data')}</div>
              ) : (
                <div className="roster-list">
                  {roster.map(r => {
                    const st = studentStatus(r, selected);
                    const canToggle = selected.attendance_open && (st.variant === 'green' || st.variant === 'red');
                    return (
                      <div key={r.id} className="roster-row">
                        <span className="roster-name">{r.name}</span>
                        {canToggle ? (
                          <button className="badge-toggle" data-variant={st.variant}
                            title={st.variant === 'green' ? t('attendance.absent') : t('attendance.present')}
                            onClick={async () => {
                              const next = r.status === 'present' ? 'absent' : 'present';
                              await setAttendanceStatus(selected.id, r.id, next);
                              fetchRoster(selected.id);
                            }}>
                            {st.label}
                          </button>
                        ) : (
                          <Badge variant={st.variant}>{st.label}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DetailPanel>

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editTarget ? t('common.edit') : t('sessions.add')}</span>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            {formError && <div className="error-msg" style={{ marginBottom:12 }}>{formError}</div>}
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">{t('sessions.teacher')}</label>
                  <select className="form-input" value={form.teacher_id}
                    onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value, module_id: '' }))}>
                    <option value="">{t('common.select')}</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('sessions.module')}</label>
                  <select className="form-input" value={form.module_id}
                    onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}>
                    <option value="">{t('common.select')}</option>
                    {formModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group form-group-full">
                  <label className="form-label">{t('sessions.group')}</label>
                  <select className="form-input" value={form.group_id}
                    onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}>
                    <option value="">{t('common.select')}</option>
                    {allGroups.map(g => <option key={g.id} value={g.id}>{g.level_name} › {g.year_name} › {g.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('sessions.start_time')}</label>
                    <TimeSelect value={form.start_time || '08:00'}
                      onChange={v => setForm(p => ({
                        ...p, start_time: v,
                        end_time: !p.end_time || p.end_time === addMinutes(p.start_time, 90) ? addMinutes(v, 90) : p.end_time,
                      }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('sessions.end_time')}</label>
                    <TimeSelect value={form.end_time || addMinutes(form.start_time || '08:00', 90)}
                      onChange={v => setForm(p => ({ ...p, end_time: v }))} />
                  </div>
                </div>
                {!editTarget && (
                  <>
                    <div className="form-group">
                      <label className="form-label">{t('sessions.type')}</label>
                      <select className="form-input" value={form.type}
                        onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                        <option value="one_time">{t('sessions.type_one_time')}</option>
                        <option value="recurring">{t('sessions.type_recurring')}</option>
                      </select>
                    </div>
                    {form.type === 'one_time' ? (
                      <div className="form-group">
                        <label className="form-label">{t('sessions.date')}</label>
                        <input type="date" className="form-input" value={form.date}
                          onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                    ) : (
                      <>
                        <div className="form-group">
                          <label className="form-label">{t('sessions.recurrence')}</label>
                          <select className="form-input" value={form.recurrence}
                            onChange={e => setForm(p => ({ ...p, recurrence: e.target.value }))}>
                            <option value="daily">{t('sessions.daily')}</option>
                            <option value="weekly">{t('sessions.weekly')}</option>
                          </select>
                        </div>
                        {form.recurrence === 'weekly' && (
                          <div className="form-group form-group-full">
                            <label className="form-label">{t('sessions.days_of_week')}</label>
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                              {DAY_NAMES_EN.map((d, i) => (
                                <button key={i} type="button"
                                  className={`btn btn-sm ${form.days_of_week.includes(i) ? 'btn-primary' : 'btn-ghost'}`}
                                  onClick={() => toggleDay(i)}>{d}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="form-group">
                          <label className="form-label">{t('sessions.start_date')}</label>
                          <input type="date" className="form-input" value={form.start_date}
                            onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('sessions.end_date')}</label>
                          <input type="date" className="form-input" value={form.end_date}
                            onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
              <button className={`btn btn-primary${saving?' btn-loading':''}`} onClick={handleSave} disabled={saving}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSingleTarget && (
        <ConfirmModal message="Supprimer cette séance ?"
          confirmLabel={t('common.delete')}
          onConfirm={() => { handleDelete(deleteSingleTarget, false); setDeleteSingleTarget(null); }}
          onCancel={() => setDeleteSingleTarget(null)} />
      )}

      {closeAttendTarget && (
        <ConfirmModal message="Fermer la présence ? Les absences seront enregistrées automatiquement."
          confirmLabel={t('sessions.close_attendance')}
          onConfirm={async () => {
            const { closeAttendance } = await import('../api/attendance');
            await closeAttendance(closeAttendTarget.id);
            setCloseAttendTarget(null);
            loadSessions();
            setSelected(prev => prev ? { ...prev, attendance_open: 0 } : null);
          }}
          onCancel={() => setCloseAttendTarget(null)} />
      )}

      {deleteTarget && deleteRecurring && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:380 }}>
            <div className="modal-header">
              <span className="modal-title">{t('sessions.delete_recurring_q')}</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost"
                onClick={() => { setDeleteTarget(null); setDeleteRecurring(false); }}>{t('common.cancel')}</button>
              <button className="btn btn-ghost" onClick={() => handleDelete(deleteTarget, false)}>
                {t('sessions.delete_recurring_no')}
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget, true)}>
                {t('sessions.delete_recurring_yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>

    {/* Scan result popup — bottom-right, away from detail panel */}
    {scanResult && (
      <ScanPopup result={scanResult} onClose={() => setScanResult(null)} />
    )}
    </>
  );
}
