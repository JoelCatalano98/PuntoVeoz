const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedor.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');


router.use(requireAuth);

router.get('/', proveedorController.listar);
router.get('/:id', proveedorController.obtener);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), proveedorController.crear);
router.put('/:id', requireRole('ADMIN', 'SUPERADMIN'), proveedorController.actualizar);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), proveedorController.eliminar);

module.exports = router;
