const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.login = (req, res) => {
  const { email, password, school_id } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = User.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const schools = User.getSchools(user.id);
  if (schools.length === 0) {
    return res.status(403).json({ message: 'This account is not assigned to any school' });
  }

  // determine which school to use
  let selected;
  if (school_id) {
    selected = schools.find((s) => s.id === Number(school_id));
    if (!selected) return res.status(403).json({ message: 'Access to this school is not allowed' });
  } else if (schools.length === 1) {
    selected = schools[0]; // auto-select when there's only one
  } else {
    // user belongs to multiple schools — ask them to pick one
    return res.json({
      requires_school_selection: true,
      user: { id: user.id, name: user.name, email: user.email },
      schools: schools.map((s) => ({ id: s.id, name: s.name, code: s.code, role: s.role })),
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: selected.role,
      school_id: selected.id,
      teacher_id: selected.teacher_id || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: selected.role,
      school_id: selected.id,
      school_name: selected.name,
      teacher_id: selected.teacher_id || null,
    },
  });
};

exports.logout = (req, res) => {
  res.json({ message: 'Logged out' });
};

exports.changePassword = (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }
  const user = User.findById(req.user.id);
  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  User.updatePassword(user.id, hash);
  res.json({ message: 'Mot de passe modifié avec succès' });
};

exports.me = (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // re-attach current school context from token
  res.json({
    ...user,
    role: req.user.role,
    school_id: req.user.school_id,
    teacher_id: req.user.teacher_id || null,
  });
};
