const { Router } = require('express');
const cajaController = require('../controllers/caja.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas de caja requieren autenticación y comercioId
router.use(requireAuth, attachTenant);

router.get('/estado', cajaController.obtenerEstado);
router.post('/abrir', cajaController.abrirCaja);
router.post('/movimiento-manual', cajaController.registrarMovimiento);
router.post('/cerrar', cajaController.cerrarCaja);
router.get('/:aperturaCajaId/esperado', cajaController.obtenerEsperado);
router.get('/:aperturaCajaId/movimientos', cajaController.listarMovimientos);

module.exports = router;
