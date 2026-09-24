const prisma = require('../config/prisma');
const dinero = require('../utils/dinero');

async function crearVenta({ comercioId, usuarioId, aperturaCajaId, clienteId, items, montoRecibido, medioPago, listaPrecioId, descuentoGlobal = 0, estado = 'COMPLETADA' }) {
  // Todo ocurre dentro de una única transacción
  return await prisma.$transaction(async (tx) => {
    // 1. VALIDACIONES
    
    // 1.c) Buscar AperturaCaja abierta si el estado es COMPLETADA
    let apertura = null;
    let puntoVentaId = 1; // Fallback temporal si es presupuesto y no requiere caja

    if (estado === 'COMPLETADA' || estado === 'FACTURADA') {
      apertura = await tx.aperturaCaja.findFirst({
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
      
      puntoVentaId = apertura.caja.puntoVentaId;
    } else {
      // Para PRESUPUESTO o REMITO_PENDIENTE podemos agarrar el primer punto de venta activo del comercio
      const pv = await tx.puntoVenta.findFirst({ where: { comercioId, activo: true } });
      if (pv) puntoVentaId = pv.id;
    }

    if (clienteId) {
      const cliente = await tx.cliente.findFirst({
        where: { id: clienteId, comercioId }
      });
      if (!cliente) {
        throw new Error('El cliente indicado no existe o no pertenece a este comercio');
      }
    }

    let listaPrecio = null;
    if (listaPrecioId) {
      listaPrecio = await tx.listaPrecio.findFirst({
        where: { id: listaPrecioId, comercioId }
      });
      if (!listaPrecio) {
        throw new Error('La lista de precios indicada no existe o no pertenece a este comercio');
      }
    }

    const productosValidados = [];
    const subtotales = [];

    // 1.a) y 1.b) Validar productos y stock
    for (const item of items) {
      let producto = null;
      if (item.productoId) {
        producto = await tx.producto.findUnique({
          where: { id: item.productoId }
        });

        if (!producto || producto.comercioId !== comercioId) {
          throw new Error(`El producto con ID ${item.productoId} no existe o no pertenece a este comercio`);
        }

        if (producto.stockActual < item.cantidad) {
          throw new Error(`No hay stock suficiente para el producto: ${producto.nombre}`);
        }
      }

      // 2. CÁLCULOS
      // 2.a) Subtotal del item usando dinero.js
      let precioLista = item.precioUnitario !== undefined && item.precioUnitario !== null 
        ? dinero.toDecimal(item.precioUnitario) 
        : (producto ? dinero.toDecimal(producto.precioVenta) : dinero.toDecimal(0));
      if (listaPrecio) {
        const valorLista = dinero.toDecimal(listaPrecio.valor);
        if (listaPrecio.tipoModificador === 'PORCENTAJE') {
          const factor = dinero.toDecimal(1).plus(valorLista.dividedBy(100));
          precioLista = precioLista.times(factor);
        } else {
          precioLista = precioLista.plus(valorLista);
        }
      }

      let precioUnitarioFinal = precioLista;
      const bonifPorcentaje = dinero.toDecimal(item.descuentoLinea || 0);
      if (bonifPorcentaje.greaterThan(0)) {
        const factorBonif = dinero.toDecimal(1).minus(bonifPorcentaje.dividedBy(100));
        precioUnitarioFinal = precioUnitarioFinal.times(factorBonif);
      }

      const subtotal = dinero.multiplicar(precioUnitarioFinal, item.cantidad);
      subtotales.push(subtotal);

      productosValidados.push({
        productoId: item.productoId || null,
        cantidad: item.cantidad,
        descripcion: item.descripcion || (producto ? producto.nombre : 'Ítem Manual'),
        producto,
        precioUnitarioFinal,
        descuentoLinea: bonifPorcentaje.toNumber(),
        subtotal
      });
    }

    // 2.b) Total de la venta re-calculado estrictamente por el backend
    let total = dinero.sumar(...subtotales);
    
    const dGlobal = dinero.toDecimal(descuentoGlobal);
    if (dGlobal.greaterThan(0)) {
      total = total.minus(dGlobal);
      if (total.lessThan(0)) total = dinero.toDecimal(0);
    }

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
        listaPrecioId: listaPrecio ? listaPrecio.id : null,
        descuentoGlobal: dGlobal.toNumber(),
        total,
        montoRecibido: montoFinal.toNumber(),
        vuelto,
        medioPago,
        estado,
        items: {
          create: productosValidados.map(item => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            descripcion: item.descripcion,
            precioUnitario: item.precioUnitarioFinal.toNumber(),
            descuentoLinea: item.descuentoLinea,
            subtotal: item.subtotal.toNumber()
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

    if (estado === 'COMPLETADA' || estado === 'FACTURADA') {
      // 3.c) Actualizar stock y crear MovimientoStock para cada item
      for (const item of productosValidados) {
        if (!item.productoId) continue;
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
    }

    // 4. Retornar la venta con sus items
    return venta;
  });
}

async function anularVenta(comercioId, usuarioId, ventaId) {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, comercioId },
      include: {
        items: true,
        movimientoCaja: true
      }
    });

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    if (venta.anulada || venta.estado === 'ANULADA') {
      throw new Error('Esta venta ya se encuentra anulada');
    }

    // 1. Marcar como anulada
    await tx.venta.update({
      where: { id: venta.id },
      data: { anulada: true, estado: 'ANULADA' }
    });

    if (venta.estado === 'COMPLETADA' || venta.estado === 'FACTURADA' || venta.estado === 'REMITO_APROBADO') {
      // 2. Devolver Stock y registrar movimientos
      for (const item of venta.items) {
        if (!item.productoId) continue;
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stockActual: { increment: item.cantidad } }
        });

        await tx.movimientoStock.create({
          data: {
            comercioId,
            productoId: item.productoId,
            usuarioId,
            tipo: 'ENTRADA',
            cantidad: item.cantidad,
            motivo: `Anulación de Venta #${venta.id}`,
            ventaId: venta.id
          }
        });
      }

      // 3. Devolver Dinero a la Caja SOLO si movió dinero (FACTURADA o COMPLETADA)
      if ((venta.estado === 'COMPLETADA' || venta.estado === 'FACTURADA') && venta.movimientoCaja) {
        await tx.movimientoCaja.create({
          data: {
            aperturaCajaId: venta.movimientoCaja.aperturaCajaId,
            cajaId: venta.movimientoCaja.cajaId,
            tipo: 'EGRESO_MANUAL',
            monto: venta.movimientoCaja.monto,
            medioPago: venta.movimientoCaja.medioPago,
            descripcion: `Devolución por Anulación de Venta #${venta.id}`
          }
        });
      }
    }

    return venta;
  });
}

// Transición: REMITO_PENDIENTE -> REMITO_APROBADO
// Descuenta stock. NO mueve caja.
async function aprobarRemito({ comercioId, usuarioId, ventaId }) {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, comercioId },
      include: {
        items: { include: { producto: true } }
      }
    });

    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado !== 'REMITO_PENDIENTE') throw new Error('La venta no se encuentra en estado REMITO_PENDIENTE');

    // Actualizar stock
    for (const item of venta.items) {
      if (!item.productoId) continue;
      const resultado = await tx.producto.updateMany({
        where: { id: item.productoId, stockActual: { gte: item.cantidad } },
        data: { stockActual: { decrement: item.cantidad } }
      });

      if (resultado.count === 0) {
        throw new Error(`Stock insuficiente para el producto: ${item.producto.nombre}. No se puede aprobar el remito.`);
      }

      await tx.movimientoStock.create({
        data: {
          comercioId, productoId: item.productoId, usuarioId,
          tipo: 'SALIDA', cantidad: item.cantidad,
          motivo: 'Aprobación de Remito', ventaId: venta.id
        }
      });
    }

    // Actualizar estado
    return await tx.venta.update({
      where: { id: venta.id },
      data: { estado: 'REMITO_APROBADO' }
    });
  });
}

// Transición: REMITO_APROBADO -> FACTURADA
// Mueve caja. NO descuenta stock (ya se descontó).
async function facturarRemito({ comercioId, usuarioId, ventaId, aperturaCajaId, medioPago, montoRecibido }) {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, comercioId }
    });

    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado !== 'REMITO_APROBADO') throw new Error('La venta no se encuentra en estado REMITO_APROBADO');

    const apertura = await tx.aperturaCaja.findFirst({
      where: { id: aperturaCajaId, comercioId, cierre: null },
      include: { caja: true }
    });
    if (!apertura) throw new Error('No hay una caja abierta válida con ese ID para cobrar');

    let montoFinal = dinero.toDecimal(montoRecibido);
    if (medioPago !== 'EFECTIVO') montoFinal = dinero.toDecimal(venta.total);
    if (montoFinal.lessThan(dinero.toDecimal(venta.total))) {
      throw new Error(`El monto recibido no cubre el total de la venta`);
    }
    const vuelto = dinero.calcularVuelto(venta.total, montoFinal.toNumber());

    // Actualizar estado y caja
    const ventaActualizada = await tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: 'FACTURADA',
        medioPago, montoRecibido: montoFinal.toNumber(), vuelto,
        puntoVentaId: apertura.caja.puntoVentaId
      }
    });

    await tx.movimientoCaja.create({
      data: {
        aperturaCajaId: apertura.id, cajaId: apertura.cajaId, ventaId: venta.id,
        tipo: 'VENTA', monto: venta.total, medioPago
      }
    });

    return ventaActualizada;
  });
}

// Transición: REMITO_PENDIENTE -> FACTURADA
// Descuenta stock Y mueve caja en un solo paso.
async function aprobarYFacturarRemito({ comercioId, usuarioId, ventaId, aperturaCajaId, medioPago, montoRecibido }) {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, comercioId },
      include: {
        items: { include: { producto: true } }
      }
    });

    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado !== 'REMITO_PENDIENTE') throw new Error('La venta no se encuentra en estado REMITO_PENDIENTE');

    const apertura = await tx.aperturaCaja.findFirst({
      where: { id: aperturaCajaId, comercioId, cierre: null },
      include: { caja: true }
    });
    if (!apertura) throw new Error('No hay una caja abierta válida con ese ID para cobrar');

    let montoFinal = dinero.toDecimal(montoRecibido);
    if (medioPago !== 'EFECTIVO') montoFinal = dinero.toDecimal(venta.total);
    if (montoFinal.lessThan(dinero.toDecimal(venta.total))) {
      throw new Error(`El monto recibido no cubre el total de la venta`);
    }
    const vuelto = dinero.calcularVuelto(venta.total, montoFinal.toNumber());

    // 1. Descontar Stock
    for (const item of venta.items) {
      if (!item.productoId) continue;
      const resultado = await tx.producto.updateMany({
        where: { id: item.productoId, stockActual: { gte: item.cantidad } },
        data: { stockActual: { decrement: item.cantidad } }
      });

      if (resultado.count === 0) {
        throw new Error(`Stock insuficiente para el producto: ${item.producto.nombre}. No se puede aprobar el remito.`);
      }

      await tx.movimientoStock.create({
        data: {
          comercioId, productoId: item.productoId, usuarioId,
          tipo: 'SALIDA', cantidad: item.cantidad,
          motivo: 'Aprobación y Facturación de Remito', ventaId: venta.id
        }
      });
    }

    // 2. Mover Caja y Actualizar Estado
    const ventaActualizada = await tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: 'FACTURADA',
        medioPago, montoRecibido: montoFinal.toNumber(), vuelto,
        puntoVentaId: apertura.caja.puntoVentaId
      }
    });

    await tx.movimientoCaja.create({
      data: {
        aperturaCajaId: apertura.id, cajaId: apertura.cajaId, ventaId: venta.id,
        tipo: 'VENTA', monto: venta.total, medioPago
      }
    });

    return ventaActualizada;
  });
}

// Transición: PRESUPUESTO -> FACTURADA
// Descuenta stock Y mueve caja. (antiguo efectivizarPresupuesto)
async function facturarPresupuesto({ comercioId, usuarioId, ventaId, aperturaCajaId, medioPago, montoRecibido }) {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, comercioId },
      include: { items: { include: { producto: true } } }
    });

    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado !== 'PRESUPUESTO') throw new Error('La venta no se encuentra en estado PRESUPUESTO');

    const apertura = await tx.aperturaCaja.findFirst({
      where: { id: aperturaCajaId, comercioId, cierre: null },
      include: { caja: true }
    });
    if (!apertura) throw new Error('No hay una caja abierta válida con ese ID para cobrar');

    let montoFinal = dinero.toDecimal(montoRecibido);
    if (medioPago !== 'EFECTIVO') montoFinal = dinero.toDecimal(venta.total);
    if (montoFinal.lessThan(dinero.toDecimal(venta.total))) {
      throw new Error(`El monto recibido no cubre el total de la venta`);
    }
    const vuelto = dinero.calcularVuelto(venta.total, montoFinal.toNumber());

    for (const item of venta.items) {
      if (!item.productoId) continue;
      const resultado = await tx.producto.updateMany({
        where: { id: item.productoId, stockActual: { gte: item.cantidad } },
        data: { stockActual: { decrement: item.cantidad } }
      });
      if (resultado.count === 0) throw new Error(`Stock insuficiente para el producto: ${item.producto.nombre}`);

      await tx.movimientoStock.create({
        data: {
          comercioId, productoId: item.productoId, usuarioId,
          tipo: 'SALIDA', cantidad: item.cantidad,
          motivo: 'Venta (Presupuesto Facturado)', ventaId: venta.id
        }
      });
    }

    const ventaActualizada = await tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: 'FACTURADA',
        medioPago, montoRecibido: montoFinal.toNumber(), vuelto,
        puntoVentaId: apertura.caja.puntoVentaId
      }
    });

    await tx.movimientoCaja.create({
      data: {
        aperturaCajaId: apertura.id, cajaId: apertura.cajaId, ventaId: venta.id,
        tipo: 'VENTA', monto: venta.total, medioPago
      }
    });

    return ventaActualizada;
  });
}

// Transición: PRESUPUESTO -> REMITO_PENDIENTE
async function convertirPresupuestoEnRemito({ comercioId, ventaId }) {
  return await prisma.venta.updateMany({
    where: { id: ventaId, comercioId, estado: 'PRESUPUESTO' },
    data: { estado: 'REMITO_PENDIENTE' }
  });
}

async function actualizarPresupuesto({ comercioId, usuarioId, ventaId, clienteId, items }) {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, comercioId }
    });

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    if (venta.estado !== 'PRESUPUESTO') {
      throw new Error('Solo se pueden editar ventas en estado PRESUPUESTO');
    }

    if (clienteId) {
      const cliente = await tx.cliente.findFirst({
        where: { id: clienteId, comercioId }
      });
      if (!cliente) {
        throw new Error('El cliente indicado no existe o no pertenece a este comercio');
      }
    }

    // 1. Borrar items actuales
    await tx.ventaItem.deleteMany({
      where: { ventaId }
    });

    // 2. Calcular nuevo total
    let total = 0;
    const itemsData = [];

    for (const item of items) {
      let producto = null;
      let precioUnitario = 0;
      if (item.productoId) {
        producto = await tx.producto.findUnique({
          where: { id: item.productoId }
        });

        if (!producto || producto.comercioId !== comercioId) {
          throw new Error(`El producto con ID ${item.productoId} no existe`);
        }
        precioUnitario = producto.precioVenta;
      } else {
        precioUnitario = item.precioUnitario || 0;
      }

      const subtotal = dinero.multiplicar(precioUnitario, item.cantidad);
      total = dinero.sumar(total, subtotal);

      itemsData.push({
        productoId: producto ? producto.id : null,
        cantidad: item.cantidad,
        precioUnitario,
        descripcion: item.descripcion || (producto ? producto.nombre : 'Ítem Manual'),
        descuentoLinea: 0,
        subtotal
      });
    }

    // 3. Actualizar Venta y crear nuevos items
    const ventaActualizada = await tx.venta.update({
      where: { id: ventaId },
      data: {
        clienteId,
        total,
        usuarioId,
        items: {
          create: itemsData
        }
      },
      include: {
        items: {
          include: { producto: true }
        },
        cliente: true
      }
    });

    return ventaActualizada;
  });
}

const arcaService = require('./arca.service');

// ... (other functions)

async function facturarAfip({ comercioId, ventaId, clienteId, concepto = 1 }) {
  // 1. Validar venta y cliente fuera de la transacción si AFIP tarda
  const venta = await prisma.venta.findFirst({
    where: { id: ventaId, comercioId },
    include: { cliente: true }
  });

  if (!venta) {
    throw new Error('Venta no encontrada');
  }

  if (venta.cae) {
    throw new Error('Esta venta ya posee un CAE generado');
  }

  if (venta.estado !== 'COMPLETADA' && venta.estado !== 'FACTURADA') {
    throw new Error('Solo se pueden facturar en ARCA las ventas en estado COMPLETADA o FACTURADA');
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, comercioId }
  });

  if (!cliente) {
    throw new Error('El cliente indicado no existe o no pertenece a este comercio');
  }

  if (!cliente.numeroDoc || !cliente.condicionIva) {
    throw new Error('El cliente debe tener Documento y Condición de IVA para facturar electrónicamente');
  }

  let docTipo = 99;
  if (cliente.numeroDoc.length === 11) docTipo = 80; // CUIT
  else if (cliente.numeroDoc.length >= 7 && cliente.numeroDoc.length <= 8) docTipo = 96; // DNI

  const datosVenta = {
    puntoVenta: 1, // Podría venir de venta.puntoVenta.numeroArca
    tipoCbte: 11, // Factura C
    clienteDocTipo: docTipo,
    clienteDocNro: Number(cliente.numeroDoc.replace(/\D/g, '')),
    total: venta.total.toNumber(),
    concepto
  };

  // 2. Llamada a AFIP (fuera de la transacción de DB para evitar lockeos largos)
  const afipResponse = await arcaService.emitirFactura(comercioId, datosVenta);

  // 3. Si todo salió bien, actualizar Venta
  const ventaActualizada = await prisma.venta.update({
    where: { id: ventaId },
    data: {
      clienteId: cliente.id,
      tipoComprobante: 'FACTURA_C', // Asumido
      nroFactura: afipResponse.nroFactura,
      cae: afipResponse.cae,
      vencimientoCae: afipResponse.vencimientoCae ? new Date(
        afipResponse.vencimientoCae.substring(0,4) + '-' +
        afipResponse.vencimientoCae.substring(4,6) + '-' +
        afipResponse.vencimientoCae.substring(6,8)
      ) : null,
      estadoFiscal: 'TIMBRADA'
    },
    include: {
      items: {
        include: { producto: true }
      },
      cliente: true,
      puntoVenta: true,
      usuario: true
    }
  });

  return ventaActualizada;
}

module.exports = {
  crearVenta,
  anularVenta,
  aprobarRemito,
  facturarRemito,
  aprobarYFacturarRemito,
  facturarPresupuesto,
  convertirPresupuestoEnRemito,
  actualizarPresupuesto,
  facturarAfip
};
