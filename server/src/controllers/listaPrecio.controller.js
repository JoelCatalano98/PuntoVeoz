const prisma = require('../config/prisma');

async function listar(req, res, next) {
  try {
    const listas = await prisma.listaPrecio.findMany({
      where: { comercioId: req.comercioId },
      orderBy: { nombre: 'asc' }
    });
    res.json(listas);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, tipoModificador, valor, esPredeterminada } = req.body;

    if (!nombre || !tipoModificador || valor === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const nuevaLista = await prisma.$transaction(async (tx) => {
      // Si la nueva lista es predeterminada, quitamos el flag a las demás
      if (esPredeterminada) {
        await tx.listaPrecio.updateMany({
          where: { comercioId: req.comercioId, esPredeterminada: true },
          data: { esPredeterminada: false }
        });
      }

      return await tx.listaPrecio.create({
        data: {
          comercioId: req.comercioId,
          nombre,
          tipoModificador,
          valor: Number(valor),
          esPredeterminada: Boolean(esPredeterminada)
        }
      });
    });

    res.status(201).json(nuevaLista);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, tipoModificador, valor, esPredeterminada } = req.body;

    const existente = await prisma.listaPrecio.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });

    if (!existente) {
      return res.status(404).json({ error: 'Lista de precio no encontrada' });
    }

    const listaActualizada = await prisma.$transaction(async (tx) => {
      if (esPredeterminada) {
        await tx.listaPrecio.updateMany({
          where: { comercioId: req.comercioId, esPredeterminada: true, id: { not: Number(id) } },
          data: { esPredeterminada: false }
        });
      }

      return await tx.listaPrecio.update({
        where: { id: Number(id) },
        data: {
          nombre: nombre || existente.nombre,
          tipoModificador: tipoModificador || existente.tipoModificador,
          valor: valor !== undefined ? Number(valor) : existente.valor,
          esPredeterminada: esPredeterminada !== undefined ? Boolean(esPredeterminada) : existente.esPredeterminada
        }
      });
    });

    res.json(listaActualizada);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    
    const existente = await prisma.listaPrecio.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });

    if (!existente) {
      return res.status(404).json({ error: 'Lista de precio no encontrada' });
    }

    await prisma.listaPrecio.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Lista de precio eliminada correctamente' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar
};
