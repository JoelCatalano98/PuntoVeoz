const prisma = require('../config/prisma');
const dinero = require('../utils/dinero');

async function crearVenta({ comercioId, usuarioId, aperturaCajaId, clienteId, items, montoRecibido, medioPago }) {
  // Todo ocurre dentro de una única transacción
  return await prisma.$transaction(async (tx) => {
    // 1. VALIDACIONES
    
    // 1.c) Buscar AperturaCaja abierta (sin CierreCaja asociado) usando aperturaCajaId explícito
    const apertura = await tx.aperturaCaja.findFirst({
      where: {
        id: aperturaCajaId,
        comercioId,
        cierre: null
      },
      include: {
        caja: true
      }
    });

    if (!apertura) {
      throw new Error('No hay una caja abierta válida con ese ID para registrar esta venta');
    }
    
    // Derivamos puntoVentaId de la caja asociada a la apertura
    const puntoVentaId = apertura.caja.puntoVentaId;

    if (clienteId) {
      const cliente = await tx.cliente.findFirst({
        where: { id: clienteId, comercioId }
      });
      if (!cliente) {
        throw new Error('El cliente indicado no existe o no pertenece a este comercio');
      }
    }

    const productosValidados = [];
    const subtotales = [];

    // 1.a) y 1.b) Validar productos y stock
    for (const item of items) {
      const producto = await tx.producto.findUnique({
        where: { id: item.productoId }
      });

      if (!producto || producto.comercioId !== comercioId) {
        throw new Error(`El producto con ID ${item.productoId} no existe o no pertenece a este comercio`);
      }

      if (producto.stockActual < item.cantidad) {
        throw new Error(`No hay stock suficiente para el producto: ${producto.nombre}`);
      }

      // 2. CÁLCULOS
      // 2.a) Subtotal del item usando dinero.js
      const subtotal = dinero.multiplicar(producto.precioVenta, item.cantidad);
      subtotales.push(subtotal);

      productosValidados.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        producto,
        subtotal
      });
    }

    // 2.b) Total de la venta re-calculado estrictamente por el backend
    const total = dinero.sumar(...subtotales);

    // 2.c) Validar montoRecibido y calcular vuelto
    let montoFinal = dinero.toDecimal(montoRecibido);
    
    // Si no es efectivo, el monto recibido debe coincidir exactamente con el total
    if (medioPago !== 'EFECTIVO') {
      montoFinal = total;
    }

    if (montoFinal.lessThan(total)) {
      throw new Error(`El monto recibido ($${montoFinal.toNumber()}) no cubre el total de la venta ($${total.toNumber()})`);
    }
    
    const vuelto = dinero.calcularVuelto(total, montoFinal.toNumber());

    // 3. ESCRITURAS
    
    // 3.a) y 3.b) Crear Venta y VentaItems
    const venta = await tx.venta.create({
      data: {
        comercioId,
        usuarioId,
        puntoVentaId,
        clienteId,
        total,
        montoRecibido: montoFinal.toNumber(),
        vuelto,
        medioPago,
        items: {
          create: productosValidados.map(item => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.producto.precioVenta,
            subtotal: item.subtotal
          }))
        }
      },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    });

    // 3.c) Actualizar stock y crear MovimientoStock para cada item
    for (const item of productosValidados) {
      const resultado = await tx.producto.updateMany({
        where: { 
          id: item.productoId, 
          stockActual: { gte: item.cantidad } 
        },
        data: { 
          stockActual: { decrement: item.cantidad } 
        }
      });

      if (resultado.count === 0) {
        throw new Error(`Stock insuficiente para el producto: ${item.producto.nombre} (posible venta concurrente)`);
      }

      await tx.movimientoStock.create({
        data: {
          comercioId,
          productoId: item.productoId,
          usuarioId,
          tipo: 'SALIDA',
          cantidad: item.cantidad,
          motivo: 'Venta',
          ventaId: venta.id
        }
      });
    }

    // 3.d) Crear MovimientoCaja
    await tx.movimientoCaja.create({
      data: {
        aperturaCajaId: apertura.id,
        cajaId: apertura.cajaId,
        ventaId: venta.id,
        tipo: 'VENTA',
        monto: total,
        medioPago
      }
    });

    // 4. Retornar la venta con sus items
    return venta;
  });
}

module.exports = {
  crearVenta
};
