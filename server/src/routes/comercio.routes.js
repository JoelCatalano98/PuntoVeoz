const { Router } = require('express');
const comercioController = require('../controllers/comercio.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { attachTenant } = require('../middlewares/tenant.middleware');

const router = Router();

// Todos los endpoints de comercio requieren autenticación, comercio y rol SUPERADMIN
router.use(requireAuth, attachTenant, requireRole('SUPERADMIN'));

router.get('/arca-config', comercioController.getArcaConfig);
router.post('/arca-config', comercioController.postArcaConfig);
router.delete('/arca-tokens', comercioController.deleteArcaTokens);

module.exports = router;
