const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/paymentsController');

router.use(auth);

// specific routes before /:id
router.get('/summary', adminOnly, ctrl.getSummary);
router.get('/preview-split', ctrl.previewSplit);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/consume', ctrl.consume);

module.exports = router;
