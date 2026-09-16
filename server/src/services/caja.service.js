const prisma = require('../config/prisma');
const { sumar, restar, aDosDecimales } = require('../utils/dinero');

/**
 * Abre una caja para un usuario/comercio. No permite abrir una segunda
 * caja si ya hay una abierta sin cerrar (evita duplicar turnos de caja).
 */
async function abrirCaja({ comercioId, usuarioId, cajaId, montoInicial, observaciones }) {
  const caja = await prisma.caja.findUnique({ where: { id: cajaId } });
  if (!caja || caja.comercioId !== comercioId) {
    throw new Error('La caja especificada no existe o no pertenece a este comercio');
  }

  const aperturaSinCerrar = await prisma.aperturaCaja.findFirst({
    where: { cajaId, cierre: null },
  });
  if (aperturaSinCerrar) {
    throw new Error('Ya existe una apertura sin cerrar para esta caja');
  }

  return prisma.aperturaCaja.create({
    data: { comercioId, usuarioId, cajaId, montoInicial, observaciones },
  });
}

/**
 * Registra un movimiento manual de caja (ingreso o egreso), por ejemplo
 * un retiro para pagar a un proveedor. Las ventas se registran aparte,
 * desde venta.service.js, dentro de la misma transacción de la venta.
 */
async function registrarMovimientoManual({ comercioId, aperturaCajaId, tipo, monto, descripcion }) {
  const apertura = await prisma.aperturaCaja.findUnique({
    where: { id: aperturaCajaId },
    include: { cierre: true }
  });
  if (!apertura || apertura.comercioId !== comercioId) {
    throw new Error('Apertura de caja no encontrada');
  }
  if (apertura.cierre) {
    throw new Error('No se pueden registrar movimientos en una caja ya cerrada');
  }

  if (!['INGRESO_MANUAL', 'EGRESO_MANUAL'].includes(tipo)) {
    throw new Error('Tipo de movimiento manual inválido');
  }
  return prisma.movimientoCaja.create({
    data: { aperturaCajaId, cajaId: apertura.cajaId, tipo, monto, descripcion },
  });
}

/**
 * Calcula el total esperado en caja a partir del monto inicial +
 * todos los movimientos (ventas en efectivo suman, egresos restan).
 * OJO: solo el EFECTIVO afecta el efectivo físico en el cajón.
 * Tarjeta/transferencia/QR se registran para el reporte pero no
 * se cuentan en el "esperado en efectivo".
 */
async function calcularTotalEsperadoEfectivo({ comercioId, aperturaCajaId }) {
  const apertura = await prisma.aperturaCaja.findUnique({
    where: { id: aperturaCajaId },
    include: { movimientos: true },
  });
  if (!apertura || apertura.comercioId !== comercioId) throw new Error('Apertura de caja no encontrada');

  let esperado = apertura.montoInicial;

  for (const mov of apertura.movimientos) {
    if (mov.tipo === 'VENTA' && mov.medioPago === 'EFECTIVO') {
      esperado = sumar(esperado, mov.monto);
    } else if (mov.tipo === 'INGRESO_MANUAL') {
      esperado = sumar(esperado, mov.monto);
    } else if (mov.tipo === 'EGRESO_MANUAL') {
      esperado = restar(esperado, mov.monto);
    }
    // ventas con otros medios de pago no afectan el efectivo físico
  }

  return aDosDecimales(esperado);
}

/**
 * Cierra la caja: compara lo esperado (calculado) contra lo contado
 * (ingresado manualmente por el usuario al hacer el arqueo).
 */
async function cerrarCaja({ comercioId, aperturaCajaId, usuarioId, totalContado, observaciones }) {
  const apertura = await prisma.aperturaCaja.findUnique({
    where: { id: aperturaCajaId },
    include: { cierre: true }
  });
  if (!apertura || apertura.comercioId !== comercioId) {
    throw new Error('Apertura de caja no encontrada');
  }
  if (apertura.cierre) {
    throw new Error('Esta caja ya fue cerrada');
  }

  const totalEsperado = await calcularTotalEsperadoEfectivo({ comercioId, aperturaCajaId });
  const diferencia = aDosDecimales(restar(totalContado, totalEsperado));

  return prisma.cierreCaja.create({
    data: {
      aperturaCajaId,
      usuarioId,
      totalEsperado,
      totalContado,
      diferencia,
      observaciones,
    },
  });
}

/**
 * Reporte agregado por rango de fechas (sirve para cierre diario,
 * semanal o mensual: solo cambia el rango que se le pasa).
 * Agrupa ventas por medio de pago y devuelve el total general.
 */
async function reporteVentasPorRango({ comercioId, desde, hasta }) {
  const ventas = await prisma.venta.findMany({
    where: {
      comercioId,
      anulada: false,
      createdAt: { gte: desde, lte: hasta },
    },
  });

  const totalesPorMedioPago = {};
  let totalGeneral = sumar();

  for (const venta of ventas) {
    totalGeneral = sumar(totalGeneral, venta.total);
    const medio = venta.medioPago;
    totalesPorMedioPago[medio] = aDosDecimales(
      sumar(totalesPorMedioPago[medio] ?? 0, venta.total)
    );
  }

  return {
    cantidadVentas: ventas.length,
    totalGeneral: aDosDecimales(totalGeneral),
    totalesPorMedioPago,
  };
}

async function listarMovimientos({ comercioId, aperturaCajaId }) {
  const apertura = await prisma.aperturaCaja.findUnique({
    where: { id: aperturaCajaId }
  });
  if (!apertura || apertura.comercioId !== comercioId) {
    throw new Error('Apertura de caja no encontrada');
  }

  return prisma.movimientoCaja.findMany({
    where: { aperturaCajaId },
    orderBy: { createdAt: 'desc' },
    include: {
      venta: true
    }
  });
}

module.exports = {
  abrirCaja,
  registrarMovimientoManual,
  calcularTotalEsperadoEfectivo,
  cerrarCaja,
  reporteVentasPorRango,
  listarMovimientos
};
