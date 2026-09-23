const express = require('express');
const router = express.Router();
const arcaController = require('../controllers/arca.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

router.use(requireAuth);
router.use(attachTenant);

const soloAdmins = requireRole('ADMIN', 'SUPERADMIN');

// Status Certificados
router.get('/status-certificados', soloAdmins, arcaController.getStatusCertificados);

// Puntos de Venta CRUD (GET público para autenticados, resto solo admins)
router.get('/puntos-venta', arcaController.getPuntosVenta);
router.post('/puntos-venta', soloAdmins, arcaController.createPuntoVenta);
router.get('/puntos-venta/:id', arcaController.getPuntoVenta);
router.put('/puntos-venta/:id', soloAdmins, arcaController.updatePuntoVenta);
router.delete('/puntos-venta/:id', soloAdmins, arcaController.deletePuntoVenta);

module.exports = router;
