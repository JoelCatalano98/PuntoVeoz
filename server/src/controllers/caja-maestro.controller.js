const prisma = require('../config/prisma');

async function listarCajas(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const cajas = await prisma.caja.findMany({
      where: { comercioId, activo: true },
      include: { puntoVenta: true }
    });
    res.json(cajas);
  } catch (error) {
    next(error);
  }
}

async function crearCaja(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { nombre, descripcion, prefijo, puntoVentaId } = req.body;

    if (!nombre || !prefijo || !puntoVentaId) {
      return res.status(400).json({ error: 'nombre, prefijo y puntoVentaId son obligatorios' });
    }

    const pv = await prisma.puntoVenta.findFirst({
      where: { id: Number(puntoVentaId), comercioId }
    });

    if (!pv) {
      return res.status(400).json({ error: 'Punto de venta inválido o no pertenece a este comercio' });
    }

    const caja = await prisma.caja.create({
      data: {
        comercioId,
        nombre,
        descripcion,
        prefijo,
        puntoVentaId: Number(puntoVentaId)
      }
    });

    res.status(201).json(caja);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una caja con ese prefijo en este comercio. Elegí otro.' });
    }
    next(error);
  }
}

module.exports = {
  listarCajas,
  crearCaja
};
