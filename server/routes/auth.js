const router = require('express').Router();
const { login, logout, me, changePassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', auth, me);
router.post('/change-password', auth, changePassword);

module.exports = router;
