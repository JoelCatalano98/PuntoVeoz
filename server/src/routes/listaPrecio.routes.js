const { Router } = require('express');
const listaPrecioController = require('../controllers/listaPrecio.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todos requieren autenticación y comercio
router.use(requireAuth, attachTenant);

// Endpoints (Solo Admin y Superadmin pueden gestionar listas de precios)
router.get('/', listaPrecioController.listar);
router.use(requireRole('ADMIN', 'SUPERADMIN'));
router.post('/', listaPrecioController.crear);
router.put('/:id', listaPrecioController.actualizar);
router.delete('/:id', listaPrecioController.eliminar);

module.exports = router;
