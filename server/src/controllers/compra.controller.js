const prisma = require('../config/prisma');

async function listar(req, res, next) {
  try {
    const compras = await prisma.compra.findMany({
      where: { comercioId: req.comercioId },
      include: {
        proveedor: { select: { razonSocial: true, cuit: true, direccion: true, condicionIva: true } },
        usuario: { select: { nombre: true, username: true } },
        detalles: {
          include: { producto: { select: { nombre: true, codigoBarras: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(compras);
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const { id } = req.params;
    const compra = await prisma.compra.findFirst({
      where: { id: Number(id), comercioId: req.comercioId },
      include: {
        proveedor: true,
        usuario: { select: { nombre: true, username: true } },
        detalles: {
          include: { producto: { select: { nombre: true, codigoBarras: true } } }
        }
      }
    });
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(compra);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const { proveedorId, numeroFactura, fechaEmision, total, metodoPago, cajaId, detalles, actualizarCosto } = req.body;

    if (!proveedorId || !detalles || !detalles.length) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para registrar la compra' });
    }

    const compra = await prisma.$transaction(async (tx) => {
      // 1. Crear la cabecera
      const nuevaCompra = await tx.compra.create({
        data: {
          comercioId: req.comercioId,
          proveedorId: Number(proveedorId),
          usuarioId: req.user.userId,
          numeroFactura,
          fechaEmision: new Date(fechaEmision || new Date()),
          total: Number(total),
          metodoPago: metodoPago || 'CUENTA_CORRIENTE',
          detalles: {
            create: detalles.map(d => ({
              productoId: Number(d.productoId),
              cantidad: Number(d.cantidad),
              precioCosto: Number(d.precioCosto),
              subtotal: Number(d.subtotal)
            }))
          }
        }
      });

      // 2. Si se pagó con la caja del local, generar el egreso atado a la factura
      if (metodoPago === 'EFECTIVO_CAJA') {
        if (!cajaId) throw new Error("Debe especificar la caja para el egreso en efectivo.");
        
        // Buscar la apertura de caja activa para esa caja y comercio
        const aperturaActiva = await tx.aperturaCaja.findFirst({
          where: { 
            cajaId: Number(cajaId), 
            comercioId: req.comercioId, 
            cierre: null 
          }
        });

        if (!aperturaActiva) {
          throw new Error("No tienes un turno de caja abierto para registrar un egreso en efectivo.");
        }

        await tx.movimientoCaja.create({
          data: {
            aperturaCajaId: aperturaActiva.id,
            cajaId: Number(cajaId),
            tipo: 'EGRESO_MANUAL',
            monto: Number(total),
            descripcion: `Pago a proveedor - Fac: ${numeroFactura || 'S/N'}`,
            compraId: nuevaCompra.id
          }
        });
      }

      // 3. Actualizar el stock y registrar el historial
      for (const detalle of detalles) {
        await tx.producto.update({
          where: { id: Number(detalle.productoId) },
          data: {
            stockActual: { increment: Number(detalle.cantidad) },
            precioCosto: actualizarCosto ? Number(detalle.precioCosto) : undefined,
            proveedorId: Number(proveedorId)
          }
        });

        await tx.movimientoStock.create({
          data: {
            comercioId: req.comercioId,
            productoId: Number(detalle.productoId),
            usuarioId: req.user.userId,
            tipo: 'ENTRADA',
            cantidad: Number(detalle.cantidad),
            motivo: `Compra Fac. ${numeroFactura || 'S/N'}`
          }
        });
      }

      return nuevaCompra;
    });

    res.status(201).json(compra);
  } catch (error) {
    if (error.message.includes('caja abierto')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = {
  listar,
  obtener,
  crear
};
