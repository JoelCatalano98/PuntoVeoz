const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compra.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');


router.use(requireAuth);

router.get('/', compraController.listar);
router.get('/:id', compraController.obtener);
router.post('/', requireRole('ADMIN', 'SUPERADMIN'), compraController.crear);

module.exports = router;
