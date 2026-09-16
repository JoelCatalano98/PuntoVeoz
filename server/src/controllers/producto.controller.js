const prisma = require('../config/prisma');

async function listar(req, res) {
  const productos = await prisma.producto.findMany({
    where: { comercioId: req.comercioId, activo: true },
    orderBy: { nombre: 'asc' },
    include: {
      categoria: { select: { id: true, nombre: true, color: true } },
      unidadMedida: { select: { id: true, nombre: true, abreviatura: true } }
    }
  });
  res.json(productos);
}

async function buscarPorCodigoBarras(req, res) {
  const { codigo } = req.params;
  const producto = await prisma.producto.findFirst({
    where: { comercioId: req.comercioId, codigoBarras: codigo, activo: true },
  });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
}

async function crear(req, res) {
  const { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockActual, stockMinimo, categoriaId, unidadMedidaId } = req.body;

  if (!nombre || precioVenta == null) {
    return res.status(400).json({ error: 'nombre y precioVenta son obligatorios' });
  }

  const producto = await prisma.producto.create({
    data: {
      comercioId: req.comercioId,
      nombre,
      descripcion,
      codigoBarras,
      precioCosto: precioCosto ?? 0,
      precioVenta,
      stockActual: stockActual ?? 0,
      stockMinimo: stockMinimo ?? 0,
      categoriaId,
      unidadMedidaId,
    },
  });

  res.status(201).json(producto);
}

async function actualizar(req, res) {
  const { id } = req.params;
  const producto = await prisma.producto.findFirst({
    where: { id: Number(id), comercioId: req.comercioId },
  });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

  const { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockActual, stockMinimo, activo, categoriaId, unidadMedidaId } = req.body;
  const actualizado = await prisma.producto.update({
    where: { id: producto.id },
    data: { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockActual, stockMinimo, activo, categoriaId, unidadMedidaId },
  });

  res.json(actualizado);
}

const { generarCodigoInterno } = require('../utils/codigoBarras');

async function generarCodigoBarras(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'id de producto inválido' });
    }

    const producto = await prisma.producto.findFirst({
      where: { id: Number(id), comercioId: req.comercioId },
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    if (producto.codigoBarras) {
      return res.status(400).json({ error: 'Este producto ya tiene un código asignado' });
    }

    const nuevoCodigo = generarCodigoInterno(producto.id);
    const actualizado = await prisma.producto.update({
      where: { id: producto.id },
      data: { codigoBarras: nuevoCodigo },
    });

    res.json(actualizado);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, buscarPorCodigoBarras, crear, actualizar, generarCodigoBarras };
