const db = require('../db/db');

const Student = {
  findAll(school_id, filters = {}) {
    let query = `
      SELECT s.*,
             l.name as level_name, y.name as year_name,
             g.name as group_name,
             (
               SELECT GROUP_CONCAT(gg.name, ', ')
               FROM student_groups sg2
               JOIN groups gg ON sg2.group_id = gg.id
               WHERE sg2.student_id = s.id
             ) as group_names,
             COALESCE((
               SELECT SUM(p.sessions_count - p.sessions_paid)
               FROM payments p
               WHERE p.student_id = s.id AND p.sessions_count > p.sessions_paid
             ), 0) as sessions_remaining
      FROM students s
      LEFT JOIN levels l ON s.level_id = l.id
      LEFT JOIN years y ON s.year_id = y.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.school_id = ?
    `;
    const params = [school_id];
    if (filters.level_id) { query += ' AND s.level_id = ?'; params.push(filters.level_id); }
    if (filters.year_id)  { query += ' AND s.year_id = ?';  params.push(filters.year_id); }
    if (filters.group_id) {
      query += ` AND EXISTS (SELECT 1 FROM student_groups sg WHERE sg.student_id = s.id AND sg.group_id = ?)`;
      params.push(filters.group_id);
    }
    if (filters.status)   { query += ' AND s.status = ?';   params.push(filters.status); }
    query += ' ORDER BY s.name';
    return db.prepare(query).all(...params);
  },

  findById(id, school_id) {
    const student = db.prepare(`
      SELECT s.*, l.name as level_name, y.name as year_name, g.name as group_name,
             (
               SELECT GROUP_CONCAT(gg.name, ', ')
               FROM student_groups sg2
               JOIN groups gg ON sg2.group_id = gg.id
               WHERE sg2.student_id = s.id
             ) as group_names
      FROM students s
      LEFT JOIN levels l ON s.level_id = l.id
      LEFT JOIN years y ON s.year_id = y.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.id = ? AND s.school_id = ?
    `).get(id, school_id);
    if (!student) return null;
    // attach group_ids array
    student.group_ids = db.prepare(
      'SELECT group_id FROM student_groups WHERE student_id = ?'
    ).all(id).map(r => r.group_id);
    return student;
  },

  findByQrCode(qr_code) {
    return db.prepare('SELECT * FROM students WHERE qr_code = ?').get(qr_code);
  },

  create(school_id, data) {
    const result = db.prepare(`
      INSERT INTO students (school_id, name, email, phone, parent_phone, level_id, year_id, group_id, birth_date, qr_code)
      VALUES (?, @name, @email, @phone, @parent_phone, @level_id, @year_id, @group_id, @birth_date, @qr_code)
    `).run(school_id, data);
    const newId = result.lastInsertRowid;
    // insert into student_groups (use group_ids if provided, else group_id)
    const groupIds = data.group_ids?.length ? data.group_ids
                   : data.group_id ? [data.group_id] : [];
    const insertSg = db.prepare('INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)');
    const txn = db.transaction((ids) => { for (const gid of ids) insertSg.run(newId, gid); });
    txn(groupIds.filter(Boolean).map(Number));
    return result;
  },

  update(id, school_id, data) {
    db.prepare(`
      UPDATE students
      SET name=@name, email=@email, phone=@phone, parent_phone=@parent_phone,
          level_id=@level_id, year_id=@year_id, group_id=@group_id,
          birth_date=@birth_date, status=@status
      WHERE id=@id AND school_id=@school_id
    `).run({ ...data, id, school_id });

    // update student_groups
    if (data.group_ids !== undefined) {
      db.prepare('DELETE FROM student_groups WHERE student_id = ?').run(id);
      const insertSg = db.prepare('INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)');
      const txn = db.transaction((ids) => { for (const gid of ids) insertSg.run(id, gid); });
      txn(data.group_ids.filter(Boolean).map(Number));
    } else if (data.group_id) {
      // single group (backward compat)
      db.prepare('DELETE FROM student_groups WHERE student_id = ?').run(id);
      db.prepare('INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)').run(id, data.group_id);
    }
  },

  updatePhoto(id, school_id, photo_url) {
    db.prepare('UPDATE students SET photo_url = ? WHERE id = ? AND school_id = ?').run(photo_url, id, school_id);
  },

  remove(id, school_id) {
    return db.prepare('DELETE FROM students WHERE id = ? AND school_id = ?').run(id, school_id);
  },
};

module.exports = Student;
