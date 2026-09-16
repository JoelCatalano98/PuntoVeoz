const prisma = require('../config/prisma');

async function listar(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const parametros = await prisma.parametro.findMany({
      where: { comercioId }
    });
    res.json(parametros);
  } catch (error) {
    next(error);
  }
}

async function obtenerUno(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { clave } = req.params;

    const parametro = await prisma.parametro.findUnique({
      where: {
        comercioId_clave: { comercioId, clave }
      }
    });

    if (parametro) {
      return res.json({ clave: parametro.clave, valor: parametro.valor });
    }

    // Default fallbacks instead of 404
    if (clave === 'impresionTicket') {
      return res.json({ clave, valor: 'PREGUNTAR' });
    }

    return res.json({ clave, valor: null });
  } catch (error) {
    next(error);
  }
}

async function guardar(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { clave } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({ error: 'El valor es requerido' });
    }

    const parametro = await prisma.parametro.upsert({
      where: {
        comercioId_clave: { comercioId, clave }
      },
      update: { valor },
      create: { comercioId, clave, valor }
    });

    res.json(parametro);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerUno,
  guardar
};
