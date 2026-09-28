const { Router } = require('express');
const puntoventaController = require('../controllers/puntoventa.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');


const router = Router();

// Todas las rutas protegidas y con 
router.use(requireAuth);

// Cualquier usuario autenticado puede listar (para elegir al vender)
router.get('/', puntoventaController.listar);

// Solo ADMIN o SUPERADMIN pueden crear o modificar
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), puntoventaController.crear);
router.put('/:id', requireRole('ADMIN', 'SUPERADMIN'), puntoventaController.actualizar);

module.exports = router;
