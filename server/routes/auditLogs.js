const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/auditLogsController');

router.use(auth);
router.use(adminOnly);

router.get('/', ctrl.getAll);

module.exports = router;
