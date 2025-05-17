const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/usersController');

router.use(auth, adminOnly);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:id/role', ctrl.updateRole);
router.patch('/:id/password', ctrl.setPassword);
router.delete('/:id', ctrl.remove);

module.exports = router;
