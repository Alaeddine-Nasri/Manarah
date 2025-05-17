import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import {
  Dashboard, Students, Teachers, Layers, Sessions,
  Attendance, Payments, Payroll, Expenses, Settings, BookOpen,
  AlertCircle,
} from '../components/Icons';

/* ── Section definitions ─────────────────────────────────── */
const SECTIONS = [
  { id: 'dashboard',   icon: Dashboard,   key: 'nav.dashboard' },
  { id: 'students',    icon: Students,    key: 'nav.students' },
  { id: 'teachers',    icon: Teachers,    key: 'nav.teachers' },
  { id: 'structure',   icon: Layers,      key: 'nav.structure' },
  { id: 'sessions',    icon: Sessions,    key: 'nav.sessions' },
  { id: 'attendance',  icon: Attendance,  key: 'nav.attendance' },
  { id: 'payments',    icon: Payments,    key: 'nav.payments' },
  { id: 'payroll',     icon: Payroll,     key: 'nav.payroll' },
  { id: 'expenses',    icon: Expenses,    key: 'nav.expenses' },
  { id: 'settings',    icon: Settings,    key: 'nav.settings' },
];

/* ── Small helper components ─────────────────────────────── */
function Tip({ children }) {
  return (
    <div className="manual-tip">
      <AlertCircle size={15} color="var(--primary)" />
      <span>{children}</span>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div className="manual-step">
      <div className="manual-step-n">{n}</div>
      <div className="manual-step-body">{children}</div>
    </div>
  );
}

function Kbd({ children }) {
  return <kbd className="manual-kbd">{children}</kbd>;
}

function Badge({ color = 'green', children }) {
  return <span className={`manual-badge manual-badge--${color}`}>{children}</span>;
}

/* ── Manual sections content ─────────────────────────────── */
function SectionDashboard({ t }) {
  return (
    <>
      <p>{t('manual.dashboard.intro')}</p>
      <ul className="manual-list">
        <li><strong>{t('dashboard.total_students')}</strong> — {t('manual.dashboard.kpi_students')}</li>
        <li><strong>{t('dashboard.total_teachers')}</strong> — {t('manual.dashboard.kpi_teachers')}</li>
        <li><strong>{t('dashboard.sessions_today')}</strong> — {t('manual.dashboard.kpi_sessions')}</li>
        <li><strong>{t('dashboard.pending_payments')}</strong> — {t('manual.dashboard.kpi_payments')}</li>
        <li><strong>{t('dashboard.monthly_revenue')}</strong> — {t('manual.dashboard.kpi_revenue')}</li>
        <li><strong>{t('dashboard.attendance_rate')}</strong> — {t('manual.dashboard.kpi_attendance')}</li>
      </ul>
      <Tip>{t('manual.dashboard.tip')}</Tip>
    </>
  );
}

function SectionStudents({ t }) {
  return (
    <>
      <p>{t('manual.students.intro')}</p>

      <h4>{t('manual.students.add_title')}</h4>
      <Step n={1}>{t('manual.students.step1')}</Step>
      <Step n={2}>{t('manual.students.step2')}</Step>
      <Step n={3}>{t('manual.students.step3')}</Step>

      <h4>{t('manual.students.search_title')}</h4>
      <p>{t('manual.students.search_body')}</p>

      <h4>{t('manual.students.actions_title')}</h4>
      <ul className="manual-list">
        <li><strong>{t('students.promote')}</strong> — {t('manual.students.action_promote')}</li>
        <li><strong>{t('students.transfer')}</strong> — {t('manual.students.action_transfer')}</li>
        <li><strong>{t('students.change_status')}</strong> — {t('manual.students.action_status')}</li>
        <li><strong>{t('students.print_qr')}</strong> — {t('manual.students.action_qr')}</li>
        <li><strong>{t('students.delete')}</strong> — {t('manual.students.action_delete')}</li>
      </ul>

      <h4>{t('manual.students.statuses_title')}</h4>
      <ul className="manual-list">
        <li><Badge color="green">{t('students.status_active')}</Badge> — {t('manual.students.status_active')}</li>
        <li><Badge color="orange">{t('students.status_suspended')}</Badge> — {t('manual.students.status_suspended')}</li>
        <li><Badge color="gray">{t('students.status_archived')}</Badge> — {t('manual.students.status_archived')}</li>
      </ul>

      <Tip>{t('manual.students.tip')}</Tip>
    </>
  );
}

function SectionTeachers({ t }) {
  return (
    <>
      <p>{t('manual.teachers.intro')}</p>

      <h4>{t('manual.teachers.add_title')}</h4>
      <Step n={1}>{t('manual.teachers.step1')}</Step>
      <Step n={2}>{t('manual.teachers.step2')}</Step>
      <Step n={3}>{t('manual.teachers.step3')}</Step>

      <h4>{t('manual.teachers.rates_title')}</h4>
      <p>{t('manual.teachers.rates_body')}</p>

      <Tip>{t('manual.teachers.tip')}</Tip>
    </>
  );
}

function SectionStructure({ t }) {
  return (
    <>
      <p>{t('manual.structure.intro')}</p>

      <h4>{t('manual.structure.hierarchy_title')}</h4>
      <div className="manual-hierarchy">
        <div className="manual-hierarchy-item" style={{ color: 'var(--primary)' }}>
          {t('structure.levels')} <span className="muted">({t('manual.structure.eg')} Lycée)</span>
        </div>
        <div className="manual-hierarchy-item" style={{ paddingLeft: 24 }}>
          ↳ {t('structure.years')} <span className="muted">({t('manual.structure.eg')} 1ère, 2ème…)</span>
        </div>
        <div className="manual-hierarchy-item" style={{ paddingLeft: 48 }}>
          ↳ {t('structure.groups')} <span className="muted">({t('manual.structure.eg')} A, B, C…)</span>
        </div>
        <div className="manual-hierarchy-item" style={{ paddingLeft: 72 }}>
          ↳ {t('structure.modules')} <span className="muted">({t('manual.structure.eg')} Math, Physique…)</span>
        </div>
      </div>

      <Tip>{t('manual.structure.tip')}</Tip>
    </>
  );
}

function SectionSessions({ t }) {
  return (
    <>
      <p>{t('manual.sessions.intro')}</p>

      <h4>{t('manual.sessions.types_title')}</h4>
      <ul className="manual-list">
        <li><Badge color="gray">{t('sessions.type_one_time')}</Badge> — {t('manual.sessions.type_one_time')}</li>
        <li><Badge color="blue">{t('sessions.type_recurring')}</Badge> — {t('manual.sessions.type_recurring')}</li>
      </ul>

      <h4>{t('manual.sessions.add_title')}</h4>
      <Step n={1}>{t('manual.sessions.step1')}</Step>
      <Step n={2}>{t('manual.sessions.step2')}</Step>
      <Step n={3}>{t('manual.sessions.step3')}</Step>
      <Step n={4}>{t('manual.sessions.step4')}</Step>

      <h4>{t('manual.sessions.attendance_title')}</h4>
      <p>{t('manual.sessions.attendance_body')}</p>

      <Tip>{t('manual.sessions.tip')}</Tip>
    </>
  );
}

function SectionAttendance({ t }) {
  return (
    <>
      <p>{t('manual.attendance.intro')}</p>

      <h4>{t('manual.attendance.workflow_title')}</h4>
      <Step n={1}>{t('manual.attendance.step1')}</Step>
      <Step n={2}>{t('manual.attendance.step2')}</Step>
      <Step n={3}>{t('manual.attendance.step3')}</Step>
      <Step n={4}>{t('manual.attendance.step4')}</Step>
      <Step n={5}>{t('manual.attendance.step5')}</Step>

      <h4>{t('manual.attendance.scan_title')}</h4>
      <ul className="manual-list">
        <li><strong>{t('manual.attendance.scan_paste')}</strong> — {t('manual.attendance.scan_paste_body')}</li>
        <li><strong>{t('manual.attendance.scan_camera')}</strong> — {t('manual.attendance.scan_camera_body')}</li>
      </ul>

      <h4>{t('manual.attendance.toggle_title')}</h4>
      <p>{t('manual.attendance.toggle_body')}</p>

      <Tip>{t('manual.attendance.tip')}</Tip>
    </>
  );
}

function SectionPayments({ t }) {
  return (
    <>
      <p>{t('manual.payments.intro')}</p>

      <h4>{t('manual.payments.types_title')}</h4>
      <ul className="manual-list">
        <li><Badge color="blue">{t('payments.type_pack')}</Badge> — {t('manual.payments.type_pack')}</li>
        <li><Badge color="gray">{t('payments.type_per_session')}</Badge> — {t('manual.payments.type_per_session')}</li>
        <li><Badge color="gray">{t('payments.type_monthly')}</Badge> — {t('manual.payments.type_monthly')}</li>
        <li><Badge color="gray">{t('payments.type_yearly')}</Badge> — {t('manual.payments.type_yearly')}</li>
        <li><Badge color="gray">{t('payments.type_custom')}</Badge> — {t('manual.payments.type_custom')}</li>
      </ul>

      <h4>{t('manual.payments.status_title')}</h4>
      <ul className="manual-list">
        <li><Badge color="green">{t('payments.status_current')}</Badge> — {t('manual.payments.status_current')}</li>
        <li><Badge color="orange">{t('payments.status_due_soon')}</Badge> — {t('manual.payments.status_due_soon')}</li>
        <li><Badge color="red">{t('payments.status_overdue')}</Badge> — {t('manual.payments.status_overdue')}</li>
      </ul>

      <h4>{t('manual.payments.consume_title')}</h4>
      <p>{t('manual.payments.consume_body')}</p>

      <Tip>{t('manual.payments.tip')}</Tip>
    </>
  );
}

function SectionPayroll({ t }) {
  return (
    <>
      <p>{t('manual.payroll.intro')}</p>
      <ul className="manual-list">
        <li>{t('manual.payroll.item1')}</li>
        <li>{t('manual.payroll.item2')}</li>
        <li>{t('manual.payroll.item3')}</li>
      </ul>
      <Tip>{t('manual.payroll.tip')}</Tip>
    </>
  );
}

function SectionExpenses({ t }) {
  return (
    <>
      <p>{t('manual.expenses.intro')}</p>

      <h4>{t('manual.expenses.categories_title')}</h4>
      <ul className="manual-list">
        <li><strong>{t('expenses.cat_rent')}</strong> — {t('manual.expenses.cat_rent')}</li>
        <li><strong>{t('expenses.cat_bills')}</strong> — {t('manual.expenses.cat_bills')}</li>
        <li><strong>{t('expenses.cat_supplies')}</strong> — {t('manual.expenses.cat_supplies')}</li>
        <li><strong>{t('expenses.cat_other')}</strong> — {t('manual.expenses.cat_other')}</li>
      </ul>

      <Tip>{t('manual.expenses.tip')}</Tip>
    </>
  );
}

function SectionSettings({ t }) {
  return (
    <>
      <p>{t('manual.settings.intro')}</p>
      <ul className="manual-list">
        <li><strong>{t('settings.appearance')}</strong> — {t('manual.settings.appearance')}</li>
        <li><strong>{t('settings.language')}</strong> — {t('manual.settings.language')}</li>
        <li><strong>{t('settings.profile')}</strong> — {t('manual.settings.profile')}</li>
        <li><strong>{t('settings.school_users')}</strong> — {t('manual.settings.users')}</li>
      </ul>

      <h4>{t('manual.settings.roles_title')}</h4>
      <ul className="manual-list">
        <li><Badge color="blue">{t('settings.role_admin')}</Badge> — {t('manual.settings.role_admin')}</li>
        <li><Badge color="gray">{t('settings.role_staff')}</Badge> — {t('manual.settings.role_staff')}</li>
      </ul>

      <Tip>{t('manual.settings.tip')}</Tip>
    </>
  );
}

const SECTION_CONTENT = {
  dashboard: SectionDashboard,
  students:  SectionStudents,
  teachers:  SectionTeachers,
  structure: SectionStructure,
  sessions:  SectionSessions,
  attendance:SectionAttendance,
  payments:  SectionPayments,
  payroll:   SectionPayroll,
  expenses:  SectionExpenses,
  settings:  SectionSettings,
};

/* ── Main page ───────────────────────────────────────────── */
export default function UserManual() {
  const { t } = useTranslation();
  const [active, setActive] = useState('dashboard');
  const contentRef = useRef(null);

  function goTo(id) {
    setActive(id);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const SectionBody = SECTION_CONTENT[active];
  const current = SECTIONS.find(s => s.id === active);

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('nav.manual')}</span>
          </div>
        </div>

        <div className="manual-layout">
          {/* ── TOC sidebar ── */}
          <nav className="manual-toc">
            <div className="manual-toc-title">
              <BookOpen size={15} /> {t('manual.toc')}
            </div>
            {SECTIONS.map(({ id, icon: Icon, key }) => (
              <button
                key={id}
                className={`manual-toc-item${active === id ? ' active' : ''}`}
                onClick={() => goTo(id)}
              >
                <Icon size={15} />
                <span>{t(key)}</span>
              </button>
            ))}
          </nav>

          {/* ── Content ── */}
          <div className="manual-content" ref={contentRef}>
            <div className="manual-section-header">
              {current && <current.icon size={22} color="var(--primary)" />}
              <h2>{t(current?.key)}</h2>
            </div>
            <div className="manual-body">
              {SectionBody && <SectionBody t={t} />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
