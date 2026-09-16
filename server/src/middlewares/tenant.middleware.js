/**
 * Toma el comercioId del token (seteado en auth.middleware) y lo deja
 * disponible en req.comercioId para que todos los controllers filtren
 * SIEMPRE por ese id. Nunca confiar en un comercioId que venga del
 * body/query del cliente.
 */
function attachTenant(req, res, next) {
  if (!req.user || !req.user.comercioId) {
    return res.status(401).json({ error: 'No se pudo determinar el comercio del usuario' });
  }
  req.comercioId = req.user.comercioId;
  next();
}

module.exports = { attachTenant };
