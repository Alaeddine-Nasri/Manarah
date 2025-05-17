const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceController');

router.use(auth);

router.get('/last-scan', ctrl.getLastScan);
router.get('/session/:sessionId', ctrl.getBySession);
router.get('/session/:sessionId/roster', ctrl.getRoster);
router.post('/scan', ctrl.scan);
router.post('/open/:sessionId', ctrl.openWindow);
router.post('/close/:sessionId', ctrl.closeWindow);
router.patch('/session/:sessionId/student/:studentId', ctrl.setStatus);

module.exports = router;
