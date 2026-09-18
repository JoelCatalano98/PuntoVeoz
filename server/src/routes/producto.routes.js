const { Router } = require('express');
const productoController = require('../controllers/producto.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas protegidas y con attachTenant
router.use(requireAuth, attachTenant);

router.get('/', productoController.listar);
router.get('/codigo/:codigo', productoController.buscarPorCodigoBarras);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), productoController.crear);
router.put('/:id', requireRole('ADMIN', 'SUPERADMIN'), productoController.actualizar);
router.post('/:id/codigo-barras', requireRole('ADMIN', 'SUPERADMIN'), productoController.generarCodigoBarras);

module.exports = router;
