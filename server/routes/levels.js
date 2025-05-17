const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/levelsController');

router.use(auth);

router.get('/', ctrl.getAll);

router.post('/', adminOnly, ctrl.createLevel);
router.put('/years/:id', adminOnly, ctrl.updateYear);
router.put('/groups/:id', adminOnly, ctrl.updateGroup);
router.delete('/years/:id', adminOnly, ctrl.removeYear);
router.delete('/groups/:id', adminOnly, ctrl.removeGroup);
router.put('/:id', adminOnly, ctrl.updateLevel);
router.delete('/:id', adminOnly, ctrl.removeLevel);

router.post('/:levelId/years', adminOnly, ctrl.createYear);
router.post('/years/:yearId/groups', adminOnly, ctrl.createGroup);

// Group students
router.get('/groups/:id/students', ctrl.getGroupStudents);
router.post('/groups/:id/students', adminOnly, ctrl.addStudentToGroup);
router.delete('/groups/:id/students/:studentId', adminOnly, ctrl.removeStudentFromGroup);

module.exports = router;
