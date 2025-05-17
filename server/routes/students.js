const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/studentsController');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/students'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.patch('/:id/promote', ctrl.promote);
router.patch('/:id/transfer', ctrl.transferGroup);
router.patch('/:id/status', ctrl.setStatus);
router.post('/:id/photo', upload.single('photo'), ctrl.uploadPhoto);

module.exports = router;
