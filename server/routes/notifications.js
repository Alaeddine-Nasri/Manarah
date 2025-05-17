const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/notificationsController');

router.use(auth);

router.get('/',               ctrl.getAll);
router.put('/read-all',       ctrl.markAllRead);
router.put('/:id/read',       ctrl.markRead);
router.delete('/:id',         ctrl.remove);

module.exports = router;
