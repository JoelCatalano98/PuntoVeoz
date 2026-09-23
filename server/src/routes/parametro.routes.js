const { Router } = require('express');
const parametroController = require('../controllers/parametro.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todos requieren autenticación y comercio
router.use(requireAuth, attachTenant);

// endpoints publicos para el comercio (ej: cajero necesita leer esto)
router.get('/:clave', parametroController.obtenerUno);

// endpoints administrativos
router.use(requireRole('ADMIN', 'SUPERADMIN'));
router.get('/config/arca', parametroController.getArcaConfig);
router.put('/config/arca', parametroController.updateArcaConfig);
router.get('/', parametroController.listar);
router.post('/generar-csr', requireRole('SUPERADMIN'), parametroController.generarCSR);
router.put('/:clave', parametroController.guardar);

module.exports = router;
