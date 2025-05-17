require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ── Auto-init: create admin user on first run if DB is empty ─────────────────
(function initAdmin() {
  try {
    const db      = require('./db/db');
    const bcrypt  = require('bcryptjs');
    const email   = process.env.ADMIN_EMAIL    || 'admin@manarah.com';
    const pass    = process.env.ADMIN_PASSWORD || 'admin123';
    const name    = process.env.ADMIN_NAME     || 'Admin';
    const school  = process.env.SCHOOL_NAME    || 'École Manarah';
    const code    = process.env.SCHOOL_CODE    || 'MANARAH';

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return; // already set up

    const sRow = db.prepare('SELECT id FROM schools WHERE code = ?').get(code);
    const schoolId = sRow
      ? sRow.id
      : db.prepare('INSERT INTO schools (name, code) VALUES (?, ?)').run(school, code).lastInsertRowid;

    const hash   = bcrypt.hashSync(pass, 10);
    const userId = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash).lastInsertRowid;
    db.prepare('INSERT OR IGNORE INTO school_users (school_id, user_id, role) VALUES (?, ?, ?)').run(schoolId, userId, 'admin');

    console.log(`[init] Admin created → ${email} / ${pass}`);
  } catch (e) {
    console.error('[init] Admin init failed:', e.message);
  }
})();

const errorHandler = require('./middleware/error');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const levelRoutes = require('./routes/levels');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const moduleRoutes = require('./routes/modules');
const sessionRoutes = require('./routes/sessions');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const expenseRoutes = require('./routes/expenses');
const payrollRoutes = require('./routes/payroll');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const notificationsRoutes = require('./routes/notifications');
const auditLogsRoutes = require('./routes/auditLogs');
const demoRoutes = require('./routes/demo');
const teacherPortalRoutes = require('./routes/teacherPortal');

const app = express();

const isProd = process.env.NODE_ENV === 'production';

// In production, serve the built React app and allow all origins
// (same server serves both frontend and API, so CORS isn't needed)
if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
} else {
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
}

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/schools', require('./routes/schools'));
app.use('/api/teacher-portal', teacherPortalRoutes);

app.use(errorHandler);

// Catch-all: send React's index.html for any non-API route
if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
