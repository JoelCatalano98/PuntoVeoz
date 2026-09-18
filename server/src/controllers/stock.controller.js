const prisma = require('../config/prisma');

async function ajustar(req, res, next) {
  try {
    const { productoId, tipo, cantidad, motivo, observaciones } = req.body;

    if (!productoId || !tipo || !cantidad || !motivo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para ajustar el stock' });
    }

    if (!['ENTRADA', 'SALIDA'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser ENTRADA o SALIDA' });
    }

    const cantidadDecimal = Number(cantidad);
    if (isNaN(cantidadDecimal) || cantidadDecimal <= 0) {
      return res.status(400).json({ error: 'cantidad debe ser un número mayor a 0' });
    }

    const ajuste = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findFirst({
        where: { id: Number(productoId), comercioId: req.comercioId }
      });

      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      if (tipo === 'SALIDA' && Number(producto.stockActual) < cantidadDecimal) {
        throw new Error('La cantidad de salida supera el stock actual disponible');
      }

      // 1. Registro Inmutable
      const mov = await tx.movimientoStock.create({
        data: {
          comercioId: req.comercioId,
          productoId: Number(productoId),
          usuarioId: req.user.userId,
          tipo,
          cantidad: cantidadDecimal,
          motivo,
          observaciones: observaciones || null
        }
      });
      
      // 2. Actualización de Stock
      const variacion = tipo === 'ENTRADA' ? cantidadDecimal : -cantidadDecimal;
      
      await tx.producto.update({
        where: { id: Number(productoId) },
        data: { stockActual: { increment: variacion } }
      });
      
      return mov;
    });

    res.status(201).json(ajuste);
  } catch (err) {
    if (err.message === 'Producto no encontrado' || err.message.includes('supera el stock actual disponible')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function historial(req, res, next) {
  try {
    const { productoId, fechaDesde, fechaHasta } = req.query;
    
    const where = { comercioId: req.comercioId };
    
    if (productoId) {
      where.productoId = Number(productoId);
    }
    
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) {
        const dateHasta = new Date(fechaHasta);
        dateHasta.setHours(23, 59, 59, 999);
        where.createdAt.lte = dateHasta;
      }
    }

    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: {
        producto: { select: { nombre: true, codigoBarras: true } },
        usuario: { select: { nombre: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // limit to last 200 to avoid huge payloads
    });

    res.json(movimientos);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ajustar,
  historial
};
