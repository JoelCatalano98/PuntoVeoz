const prisma = require('../config/prisma');

async function listar(req, res, next) {
  try {
    const unidades = await prisma.unidadMedida.findMany({
      where: { comercioId: req.comercioId, activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(unidades);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, abreviatura } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const nueva = await prisma.unidadMedida.create({
      data: {
        nombre: nombre.trim(),
        abreviatura: abreviatura ? abreviatura.trim() : null,
        comercioId: req.comercioId,
      },
    });

    res.status(201).json(nueva);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una unidad de medida con ese nombre' });
    }
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, abreviatura } = req.body;

    const existente = await prisma.unidadMedida.findFirst({
      where: { id: Number(id), comercioId: req.comercioId },
    });

    if (!existente) return res.status(404).json({ error: 'Unidad de medida no encontrada' });

    const actualizada = await prisma.unidadMedida.update({
      where: { id: Number(id) },
      data: {
        nombre: nombre ? nombre.trim() : existente.nombre,
        abreviatura: abreviatura !== undefined ? abreviatura.trim() : existente.abreviatura,
      },
    });

    res.json(actualizada);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otra unidad de medida con ese nombre' });
    }
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    
    const existente = await prisma.unidadMedida.findFirst({
      where: { id: Number(id), comercioId: req.comercioId },
    });

    if (!existente) return res.status(404).json({ error: 'Unidad de medida no encontrada' });

    const eliminada = await prisma.unidadMedida.update({
      where: { id: Number(id) },
      data: { activo: false },
    });

    res.json(eliminada);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, crear, actualizar, eliminar };
