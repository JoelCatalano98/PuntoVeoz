const { Router } = require('express');
const productoController = require('../controllers/producto.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/productos'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

const router = Router();

// Todas las rutas protegidas y con attachTenant
router.use(requireAuth, attachTenant);

router.get('/', productoController.listar);
router.get('/codigo/:codigo', productoController.buscarPorCodigoBarras);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), upload.single('imagen'), productoController.crear);
router.put('/:id', requireRole('ADMIN', 'SUPERADMIN'), upload.single('imagen'), productoController.actualizar);
router.post('/:id/codigo-barras', requireRole('ADMIN', 'SUPERADMIN'), productoController.generarCodigoBarras);

module.exports = router;
