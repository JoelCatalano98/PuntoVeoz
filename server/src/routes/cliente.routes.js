const { Router } = require('express');
const clienteController = require('../controllers/cliente.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todas las rutas protegidas y con attachTenant
router.use(requireAuth, attachTenant);

router.get('/padron/:cuit', clienteController.consultarPadron);
router.get('/', clienteController.listar);
router.post('/', clienteController.crear);
router.put('/:id', clienteController.actualizar);

module.exports = router;
