const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/teachersController');
router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);

router.post('/:id/assignments', ctrl.addAssignment);
router.delete('/:id/assignments/:assignmentId', ctrl.removeAssignment);

router.post('/:id/rates', ctrl.setRateOverride);

router.get('/:id/account', adminOnly, ctrl.getAccount);
router.post('/:id/account', adminOnly, ctrl.createAccount);
router.post('/:id/reset-password', adminOnly, ctrl.resetPassword);

module.exports = router;
