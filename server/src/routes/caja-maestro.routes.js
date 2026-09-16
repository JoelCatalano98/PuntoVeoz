const { Router } = require('express');
const cajaMaestroController = require('../controllers/caja-maestro.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

router.use(requireAuth, attachTenant);

router.get('/', cajaMaestroController.listarCajas);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), cajaMaestroController.crearCaja);

module.exports = router;
