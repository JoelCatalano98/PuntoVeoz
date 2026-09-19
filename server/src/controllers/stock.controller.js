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

async function alertas(req, res, next) {
  try {
    // Buscar productos activos cuyo stockActual sea <= stockMinimo
    // En Prisma, podemos usar lte para comparar columnas directamente no es siempre posible de forma simple,
    // pero si podemos traer todos y filtrar en memoria, o usar db.$queryRaw. 
    // Dado que Prisma no soporta comparar dos columnas en la misma tabla fácilmente en `where` sin preview features,
    // es más seguro traer los productos con stockMinimo > 0 (si consideramos que 0 es no alerta) o simplemente traerlos
    // y filtrar, o usar raw query. Vamos a hacerlo trayendo los necesarios para evitar memory bloat.
    
    // Lo más eficiente para comparar dos columnas es un queryRaw:
    const alertas = await prisma.$queryRaw`
      SELECT id, nombre, codigoBarras, stockActual, stockMinimo, categoriaId 
      FROM productos 
      WHERE comercioId = ${req.comercioId} 
        AND activo = true 
        AND stockActual <= stockMinimo
        AND stockMinimo > 0
      ORDER BY stockActual ASC
    `;

    // Si queremos parsear los Decimal devueltos por raw query (que vienen como strings/numbers dependiendo del driver):
    const formateados = alertas.map(p => ({
      ...p,
      stockActual: Number(p.stockActual),
      stockMinimo: Number(p.stockMinimo)
    }));

    res.json(formateados);
  } catch (err) {
    next(err);
  }
}

async function valorizado(req, res, next) {
  try {
    // Buscar productos activos con stockActual > 0
    const productos = await prisma.producto.findMany({
      where: {
        comercioId: req.comercioId,
        activo: true,
        stockActual: { gt: 0 }
      },
      select: {
        id: true,
        codigoBarras: true,
        nombre: true,
        stockActual: true,
        precioCosto: true,
        categoria: { select: { nombre: true } }
      },
      orderBy: { nombre: 'asc' }
    });

    let totalGeneral = 0;

    const valorizados = productos.map(p => {
      const cantidad = Number(p.stockActual);
      const costo = Number(p.precioCosto);
      const total = cantidad * costo;
      totalGeneral += total;

      return {
        ...p,
        stockActual: cantidad,
        precioCosto: costo,
        totalValorizado: total
      };
    });

    res.json({
      items: valorizados,
      totalGeneral
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ajustar,
  historial,
  alertas,
  valorizado
};
