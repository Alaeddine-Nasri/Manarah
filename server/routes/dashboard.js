const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(auth);
router.use(adminOnly);

router.get('/stats', ctrl.getStats);
router.get('/revenue-chart', ctrl.getRevenueChart);
router.get('/attendance-chart', ctrl.getAttendanceChart);
router.get('/recent-activity', ctrl.getRecentActivity);

module.exports = router;
