const prisma = require('../config/prisma');

async function listar(req, res, next) {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { comercioId: req.comercioId, activo: true, categoriaPadreId: null },
      include: {
        subcategorias: {
          where: { activo: true },
          orderBy: { nombre: 'asc' }
        }
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(categorias);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, color, categoriaPadreId } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const nueva = await prisma.categoria.create({
      data: {
        nombre: nombre.trim(),
        color: color || '#CCCCCC',
        comercioId: req.comercioId,
        categoriaPadreId: categoriaPadreId ? Number(categoriaPadreId) : null
      },
    });

    res.status(201).json(nueva);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, color, categoriaPadreId } = req.body;

    const existente = await prisma.categoria.findFirst({
      where: { id: Number(id), comercioId: req.comercioId },
    });

    if (!existente) return res.status(404).json({ error: 'Categoría no encontrada' });

    const actualizada = await prisma.categoria.update({
      where: { id: Number(id) },
      data: {
        nombre: nombre ? nombre.trim() : existente.nombre,
        color: color || existente.color,
        categoriaPadreId: categoriaPadreId !== undefined ? (categoriaPadreId ? Number(categoriaPadreId) : null) : existente.categoriaPadreId
      },
    });

    res.json(actualizada);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre' });
    }
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    
    const existente = await prisma.categoria.findFirst({
      where: { id: Number(id), comercioId: req.comercioId },
    });

    if (!existente) return res.status(404).json({ error: 'Categoría no encontrada' });

    const eliminada = await prisma.categoria.update({
      where: { id: Number(id) },
      data: { activo: false },
    });

    res.json(eliminada);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, crear, actualizar, eliminar };
