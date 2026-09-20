const cajaService = require('../services/caja.service');

async function abrirCaja(req, res, next) {
  try {
    const { cajaId, montoInicial, observaciones } = req.body;
    const comercioId = req.comercioId;
    const usuarioId = req.user.userId;

    if (!cajaId || isNaN(Number(cajaId))) {
      return res.status(400).json({ error: 'cajaId es obligatorio y debe ser válido' });
    }

    if (montoInicial === undefined || isNaN(Number(montoInicial)) || Number(montoInicial) < 0) {
      return res.status(400).json({ error: 'El montoInicial debe ser un número mayor o igual a 0' });
    }

    const apertura = await cajaService.abrirCaja({
      comercioId,
      usuarioId,
      cajaId: Number(cajaId),
      montoInicial,
      observaciones
    });

    res.status(201).json(apertura);
  } catch (error) {
    if (error.message === 'Ya existe una apertura sin cerrar para esta caja' || error.message === 'La caja especificada no existe o no pertenece a este comercio') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function obtenerEstado(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const db = require('../config/prisma');
    
    // Busca si el usuario actual tiene alguna caja abierta
    const apertura = await db.aperturaCaja.findFirst({
      where: {
        comercioId,
        cierre: null
      },
      include: {
        caja: true,
        movimientos: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!apertura) {
      return res.json({ abierta: false });
    }

    // Calcula esperado
    const totalEsperado = await cajaService.calcularTotalEsperadoEfectivo({
      comercioId,
      aperturaCajaId: apertura.id
    });

    // Calcula ingresos y egresos
    const ingresosEgresos = apertura.movimientos.reduce((acc, m) => {
      if (m.tipo === 'VENTA' || m.tipo === 'INGRESO_MANUAL') acc.ingresos += Number(m.monto);
      if (m.tipo === 'EGRESO_MANUAL') acc.egresos += Number(m.monto);
      return acc;
    }, { ingresos: 0, egresos: 0 });

    res.json({
      abierta: true,
      apertura,
      totalEsperado,
      ingresos: ingresosEgresos.ingresos,
      egresos: ingresosEgresos.egresos
    });
  } catch (error) {
    next(error);
  }
}

async function registrarMovimiento(req, res, next) {
  try {
    const { aperturaCajaId, tipo, monto, concepto } = req.body;

    if (!aperturaCajaId || isNaN(Number(aperturaCajaId))) {
      return res.status(400).json({ error: 'aperturaCajaId es obligatorio y debe ser válido' });
    }
    if (!tipo || !['INGRESO_MANUAL', 'EGRESO_MANUAL'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo de movimiento inválido (debe ser INGRESO_MANUAL o EGRESO_MANUAL)' });
    }
    if (monto === undefined || isNaN(Number(monto)) || Number(monto) <= 0) {
      return res.status(400).json({ error: 'monto debe ser un número positivo mayor a 0' });
    }
    if (!concepto || typeof concepto !== 'string' || concepto.trim() === '') {
      return res.status(400).json({ error: 'El concepto es obligatorio' });
    }

    const comercioId = req.comercioId;
    const movimiento = await cajaService.registrarMovimientoManual({
      comercioId,
      aperturaCajaId: Number(aperturaCajaId),
      tipo,
      monto,
      descripcion: concepto
    });

    res.status(201).json(movimiento);
  } catch (error) {
    if (error.message === 'Apertura de caja no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'No se pueden registrar movimientos en una caja ya cerrada') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function obtenerEsperado(req, res, next) {
  try {
    const { aperturaCajaId } = req.params;
    
    if (!aperturaCajaId || isNaN(Number(aperturaCajaId))) {
      return res.status(400).json({ error: 'aperturaCajaId es obligatorio y debe ser válido' });
    }

    const comercioId = req.comercioId;
    const totalEsperado = await cajaService.calcularTotalEsperadoEfectivo({
      comercioId,
      aperturaCajaId: Number(aperturaCajaId)
    });
    
    res.json({ aperturaCajaId: Number(aperturaCajaId), totalEsperado });
  } catch (error) {
    if (error.message === 'Apertura de caja no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

async function cerrarCaja(req, res, next) {
  try {
    const { aperturaCajaId, totalContado, observaciones } = req.body;
    const usuarioId = req.user.userId;

    if (!aperturaCajaId || isNaN(Number(aperturaCajaId))) {
      return res.status(400).json({ error: 'aperturaCajaId es obligatorio y debe ser válido' });
    }
    if (totalContado === undefined || isNaN(Number(totalContado)) || Number(totalContado) < 0) {
      return res.status(400).json({ error: 'totalContado debe ser un número mayor o igual a 0' });
    }

    const comercioId = req.comercioId;
    const cierre = await cajaService.cerrarCaja({
      comercioId,
      aperturaCajaId: Number(aperturaCajaId),
      usuarioId,
      totalContado,
      observaciones
    });

    res.json(cierre);
  } catch (error) {
    if (error.message === 'Apertura de caja no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Esta caja ya fue cerrada') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

async function listarMovimientos(req, res, next) {
  try {
    const { aperturaCajaId } = req.params;
    const { page, limit } = req.query;
    const comercioId = req.comercioId;

    if (!aperturaCajaId || isNaN(Number(aperturaCajaId))) {
      return res.status(400).json({ error: 'aperturaCajaId es obligatorio y debe ser válido' });
    }

    const movimientos = await cajaService.listarMovimientos({
      comercioId,
      aperturaCajaId: Number(aperturaCajaId),
      page,
      limit
    });

    res.json(movimientos);
  } catch (error) {
    if (error.message === 'Apertura de caja no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

async function listarCierres(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { fechaDesde, fechaHasta, page, limit } = req.query;

    const cierres = await cajaService.listarCierres({
      comercioId,
      fechaDesde,
      fechaHasta,
      page,
      limit
    });

    res.json(cierres);
  } catch (error) {
    next(error);
  }
}

async function obtenerDetalleCierre(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'ID de cierre inválido' });
    }

    const detalle = await cajaService.obtenerDetalleCierre({
      comercioId,
      cierreId: Number(id)
    });

    res.json(detalle);
  } catch (error) {
    if (error.message === 'Cierre de caja no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = {
  abrirCaja,
  registrarMovimiento,
  obtenerEsperado,
  cerrarCaja,
  obtenerEstado,
  listarMovimientos,
  listarCierres,
  obtenerDetalleCierre
};
