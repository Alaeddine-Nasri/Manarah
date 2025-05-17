const db = require('../db/db');

function createNotification({ school_id, user_id = null, type, message }) {
  db.prepare(`
    INSERT INTO notifications (school_id, user_id, type, message)
    VALUES (?, ?, ?, ?)
  `).run(school_id, user_id, type, message);
}

module.exports = { createNotification };
