const { Router } = require('express');
const usuarioController = require('../controllers/usuario.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');


const router = Router();

// Todas las rutas de usuarios requieren autenticación, tenant y rol ADMIN/SUPERADMIN
router.use(requireAuth, requireRole('ADMIN', 'SUPERADMIN'));

router.get('/', usuarioController.listar);
router.post('/', usuarioController.crear);
router.put('/:id', usuarioController.actualizar);

module.exports = router;
