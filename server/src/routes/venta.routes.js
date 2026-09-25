const { Router } = require('express');
const ventaController = require('../controllers/venta.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas protegidas y con el tenant adjunto
router.use(requireAuth, attachTenant);

router.post('/', ventaController.crearVenta);
router.post('/:id/anular', ventaController.anularVenta);
router.post('/:id/nota-credito', requireRole('ADMIN', 'SUPERADMIN'), ventaController.emitirNotaCredito);
router.post('/:id/aprobar-remito', ventaController.aprobarRemito);
router.post('/:id/facturar-remito', ventaController.facturarRemito);
router.post('/:id/aprobar-facturar', ventaController.aprobarYFacturarRemito);
router.post('/:id/facturar-presupuesto', ventaController.facturarPresupuesto);
router.post('/:id/facturar-afip', ventaController.facturarAfip);
router.get('/test-arca', ventaController.testArcaConnection);
router.post('/:id/presupuesto-a-remito', ventaController.convertirPresupuestoEnRemito);
router.get('/elegibles-nc', requireRole('ADMIN', 'SUPERADMIN'), ventaController.ventasElegiblesNC);
router.get('/historial', ventaController.historialVentas);
router.get('/notas-credito', requireRole('ADMIN', 'SUPERADMIN'), ventaController.listarNotasCredito);
router.get('/:id', ventaController.obtenerPorId);
router.put('/:id', ventaController.actualizarPresupuesto);
router.get('/', requireRole('ADMIN', 'SUPERADMIN'), ventaController.reporteVentas);

module.exports = router;
