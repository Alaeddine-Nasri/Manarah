const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/exportController');

router.use(auth);

router.get('/students',               ctrl.exportStudents);
router.get('/payments',               ctrl.exportPayments);
router.get('/receipt/payment/:id',    ctrl.exportPaymentReceipt);
router.get('/receipt/teacher/:teacher_id', ctrl.exportTeacherPayroll);

module.exports = router;
