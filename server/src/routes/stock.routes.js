const { Router } = require('express');
const stockController = require('../controllers/stock.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas protegidas y con attachTenant
router.use(requireAuth, attachTenant);

// Ajuste de stock (solo administradores o encargados)
router.post('/ajustar', requireRole('ADMIN', 'SUPERADMIN'), stockController.ajustar);

// Historial de movimientos (lectura)
router.get('/movimientos', requireRole('ADMIN', 'SUPERADMIN'), stockController.historial);

// Alertas de stock mínimo
router.get('/alertas', requireRole('ADMIN', 'SUPERADMIN'), stockController.alertas);

// Stock valorizado
router.get('/valorizado', requireRole('ADMIN', 'SUPERADMIN'), stockController.valorizado);

module.exports = router;
