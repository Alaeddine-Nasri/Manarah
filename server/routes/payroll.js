const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/payrollController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:teacher_id', ctrl.getOne);
router.post('/:teacher_id/mark-paid', ctrl.markPaid);
router.delete('/:teacher_id/mark-paid', ctrl.markUnpaid);

module.exports = router;
