const { Router } = require('express');
const cajaMaestroController = require('../controllers/caja-maestro.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');


const router = Router();

router.use(requireAuth);

router.get('/', cajaMaestroController.listarCajas);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), cajaMaestroController.crearCaja);

module.exports = router;
