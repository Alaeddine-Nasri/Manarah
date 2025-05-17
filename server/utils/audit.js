const db = require('../db/db');

function logAction({ school_id, user_id, action, entity, entity_id, details }) {
  db.prepare(`
    INSERT INTO audit_logs (school_id, user_id, action, entity, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    school_id,
    user_id ?? null,
    action,
    entity,
    entity_id ?? null,
    details ? JSON.stringify(details) : null,
  );
}

module.exports = { logAction };
