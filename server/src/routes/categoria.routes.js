const { Router } = require('express');
const categoriaController = require('../controllers/categoria.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');


const router = Router();

// Todas las rutas protegidas y con 
router.use(requireAuth);

router.get('/', categoriaController.listar);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), categoriaController.crear);
router.put('/:id', requireRole('ADMIN', 'SUPERADMIN'), categoriaController.actualizar);
router.delete('/:id', requireRole('ADMIN', 'SUPERADMIN'), categoriaController.eliminar);

module.exports = router;
