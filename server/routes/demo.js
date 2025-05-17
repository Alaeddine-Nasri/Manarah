const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const { seedDemoData } = require('../db/demoSeed');

router.post('/seed', auth, adminOnly, (req, res, next) => {
  try {
    seedDemoData(req.user.school_id);
    res.json({ message: 'Demo data loaded successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
