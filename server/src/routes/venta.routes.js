const { Router } = require('express');
const ventaController = require('../controllers/venta.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas protegidas y con el tenant adjunto
router.use(requireAuth, attachTenant);

router.post('/', ventaController.crearVenta);
router.post('/:id/anular', ventaController.anularVenta);
router.get('/historial', ventaController.historialVentas);
router.get('/:id', ventaController.obtenerPorId);
router.get('/', requireRole('ADMIN', 'SUPERADMIN'), ventaController.reporteVentas);

module.exports = router;
