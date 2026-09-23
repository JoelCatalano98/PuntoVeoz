const ventaService = require('../services/venta.service');
const cajaService = require('../services/caja.service');

async function crearVenta(req, res, next) {
  try {
    const { aperturaCajaId, items, montoRecibido, medioPago, clienteId, listaPrecioId, descuentoGlobal, estado } = req.body;
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;

    if (!aperturaCajaId || !Number.isInteger(Number(aperturaCajaId))) {
      return res.status(400).json({ error: 'aperturaCajaId es obligatorio y debe ser un número entero' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe contener al menos un item' });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!Number.isInteger(item.productoId) || item.productoId <= 0) {
        return res.status(400).json({ error: `El item en la posición ${i} tiene un productoId inválido` });
      }
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        return res.status(400).json({ error: `La cantidad del producto con ID ${item.productoId} debe ser un número entero positivo` });
      }
    }

    if (montoRecibido === undefined || montoRecibido === null || isNaN(Number(montoRecibido)) || Number(montoRecibido) < 0) {
      return res.status(400).json({ error: 'montoRecibido debe ser un número mayor o igual a 0' });
    }

    const mediosValidos = ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'QR', 'OTRO'];
    if (!medioPago || !mediosValidos.includes(medioPago)) {
      return res.status(400).json({ error: `El medioPago es inválido o no fue provisto. Valores permitidos: ${mediosValidos.join(', ')}` });
    }

    const venta = await ventaService.crearVenta({
      comercioId,
      usuarioId,
      aperturaCajaId: Number(aperturaCajaId),
      clienteId: clienteId || null,
      items,
      montoRecibido,
      medioPago,
      listaPrecioId: listaPrecioId ? Number(listaPrecioId) : null,
      descuentoGlobal: descuentoGlobal || 0,
      estado
    });

    res.status(201).json(venta);
  } catch (error) {
    if (
      error.message === 'No hay una caja abierta para registrar esta venta' ||
      error.message.startsWith('No hay stock suficiente') ||
      error.message.startsWith('Stock insuficiente') ||
      error.message.startsWith('El producto con ID') ||
      (error.message && error.message.toLowerCase().includes('monto recibido es menor'))
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function reporteVentas(req, res, next) {
  try {
    const { desde, hasta } = req.query;
    const comercioId = req.comercioId;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Los parámetros de consulta "desde" y "hasta" son obligatorios' });
    }

    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);

    if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
      return res.status(400).json({ error: 'Las fechas proporcionadas no son válidas' });
    }

    const reporte = await cajaService.reporteVentasPorRango({
      comercioId,
      desde: fechaDesde,
      hasta: fechaHasta
    });

    res.json(reporte);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const comercioId = req.comercioId;
    const { PrismaClient } = require('@prisma/client');
    const prisma = require('../config/prisma');

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'id de venta es obligatorio y debe ser válido' });
    }

    const venta = await prisma.venta.findFirst({
      where: {
        id: Number(id),
        comercioId
      },
      include: {
        items: {
          include: {
            producto: true
          }
        },
        cliente: true,
        usuario: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json(venta);
  } catch (error) {
    next(error);
  }
}

async function anularVenta(req, res, next) {
  try {
    const { id } = req.params;
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'id de venta es obligatorio y debe ser válido' });
    }

    const venta = await ventaService.anularVenta(comercioId, usuarioId, Number(id));

    res.json(venta);
  } catch (error) {
    if (error.message === 'Venta no encontrada' || error.message === 'Esta venta ya se encuentra anulada') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function historialVentas(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const prisma = require('../config/prisma');

    const { search, page = 1, limit = 50, tab, sinCae } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const whereClause = { comercioId };
    if (tab === 'REMITOS') {
      whereClause.estado = { in: ['REMITO_PENDIENTE', 'REMITO_APROBADO'] };
    } else if (tab === 'PRESUPUESTO') {
      whereClause.estado = 'PRESUPUESTO';
    } else {
      whereClause.estado = { in: ['COMPLETADA', 'FACTURADA', 'ANULADA'] };
    }

    if (sinCae === 'true') {
      whereClause.cae = null;
      whereClause.estado = { in: ['COMPLETADA', 'FACTURADA'] };
    }

    if (search) {
      const isNumber = !isNaN(Number(search));
      whereClause.OR = [
        { cliente: { nombre: { contains: search } } },
        { cliente: { razonSocial: { contains: search } } }
      ];
      if (isNumber) {
        whereClause.OR.push({ id: Number(search) });
      }
    }

    const [totalCount, ventas] = await prisma.$transaction([
      prisma.venta.count({ where: whereClause }),
      prisma.venta.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          cliente: true,
          usuario: { select: { id: true, nombre: true } },
          items: {
            include: {
              producto: true
            }
          }
        }
      })
    ]);

    res.json({
      data: ventas,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  } catch (error) {
    next(error);
  }
}

async function aprobarRemito(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;
    const ventaId = Number(req.params.id);

    const venta = await ventaService.aprobarRemito({ comercioId, usuarioId, ventaId });
    res.json(venta);
  } catch (error) {
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function facturarRemito(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;
    const ventaId = Number(req.params.id);
    const { aperturaCajaId, medioPago, montoRecibido } = req.body;

    if (!aperturaCajaId || !medioPago || montoRecibido === undefined) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para facturar (caja, medio de pago, monto)' });
    }

    const venta = await ventaService.facturarRemito({
      comercioId, usuarioId, ventaId,
      aperturaCajaId: Number(aperturaCajaId), medioPago, montoRecibido: Number(montoRecibido)
    });
    res.json(venta);
  } catch (error) {
    next(error);
  }
}

async function aprobarYFacturarRemito(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;
    const ventaId = Number(req.params.id);
    const { aperturaCajaId, medioPago, montoRecibido } = req.body;

    if (!aperturaCajaId || !medioPago || montoRecibido === undefined) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para facturar (caja, medio de pago, monto)' });
    }

    const venta = await ventaService.aprobarYFacturarRemito({
      comercioId, usuarioId, ventaId,
      aperturaCajaId: Number(aperturaCajaId), medioPago, montoRecibido: Number(montoRecibido)
    });
    res.json(venta);
  } catch (error) {
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function facturarPresupuesto(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;
    const ventaId = Number(req.params.id);
    const { aperturaCajaId, medioPago, montoRecibido } = req.body;

    if (!aperturaCajaId || !medioPago || montoRecibido === undefined) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para facturar (caja, medio de pago, monto)' });
    }

    const venta = await ventaService.facturarPresupuesto({
      comercioId, usuarioId, ventaId,
      aperturaCajaId: Number(aperturaCajaId), medioPago, montoRecibido: Number(montoRecibido)
    });
    res.json(venta);
  } catch (error) {
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function convertirPresupuestoEnRemito(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const ventaId = Number(req.params.id);
    await ventaService.convertirPresupuestoEnRemito({ comercioId, ventaId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function actualizarPresupuesto(req, res, next) {
  try {
    const { items, clienteId } = req.body;
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;
    const ventaId = Number(req.params.id);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe contener al menos un item' });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!Number.isInteger(item.productoId) || item.productoId <= 0) {
        return res.status(400).json({ error: `El item en la posición ${i} tiene un productoId inválido` });
      }
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        return res.status(400).json({ error: `La cantidad del producto con ID ${item.productoId} debe ser un número entero positivo` });
      }
    }

    const venta = await ventaService.actualizarPresupuesto({
      comercioId,
      usuarioId,
      ventaId,
      clienteId: clienteId || null,
      items
    });

    res.json(venta);
  } catch (error) {
    next(error);
  }
}

async function facturarAfip(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const ventaId = Number(req.params.id);
    const { clienteId, concepto } = req.body;

    if (!clienteId || isNaN(Number(clienteId))) {
      return res.status(400).json({ error: 'El clienteId es obligatorio y debe ser válido' });
    }

    const ventaActualizada = await ventaService.facturarAfip({
      comercioId,
      ventaId,
      clienteId: Number(clienteId),
      concepto: concepto ? Number(concepto) : 1
    });

    res.json(ventaActualizada);
  } catch (error) {
    // Si el error viene de AFIP o es de validación
    res.status(400).json({ error: error.message || 'Error al comunicarse con AFIP' });
  }
}

async function testArcaConnection(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const arcaService = require('../services/arca.service');
    const prisma = require('../config/prisma');
    
    const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
    const ptoVta = comercio?.arcaPtoVta || 1;

    // Factura C (11) por defecto para test
    const ultimoCmp = await arcaService.obtenerUltimoComprobante(comercioId, ptoVta, 11);
    res.json({ success: true, ultimoComprobante: ultimoCmp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  crearVenta,
  reporteVentas,
  obtenerPorId,
  anularVenta,
  historialVentas,
  aprobarRemito,
  facturarRemito,
  aprobarYFacturarRemito,
  facturarPresupuesto,
  convertirPresupuestoEnRemito,
  actualizarPresupuesto,
  facturarAfip,
  testArcaConnection
};
