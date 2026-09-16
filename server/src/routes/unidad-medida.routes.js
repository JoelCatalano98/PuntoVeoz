const { Router } = require('express');
const unidadMedidaController = require('../controllers/unidad-medida.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas protegidas y con attachTenant
router.use(requireAuth, attachTenant);

router.get('/', unidadMedidaController.listar);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), unidadMedidaController.crear);
router.put('/:id', requireRole('ADMIN', 'SUPERADMIN'), unidadMedidaController.actualizar);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), unidadMedidaController.eliminar);

module.exports = router;
