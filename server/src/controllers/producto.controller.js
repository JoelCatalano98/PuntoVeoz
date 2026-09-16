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

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.producto.create({
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

    if (stockActual > 0) {
      await tx.movimientoStock.create({
        data: {
          productoId: p.id,
          tipo: 'ENTRADA',
          cantidad: stockActual,
          motivo: 'Stock Inicial',
        }
      });
    }
    
    return p;
  });

  res.status(201).json(result);
}

async function actualizar(req, res) {
  const { id } = req.params;
  const producto = await prisma.producto.findFirst({
    where: { id: Number(id), comercioId: req.comercioId },
  });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

  // Omitimos stockActual para prevenir Mass Assignment
  const { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockMinimo, activo, categoriaId, unidadMedidaId } = req.body;
  const actualizado = await prisma.producto.update({
    where: { id: producto.id },
    data: { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockMinimo, activo, categoriaId, unidadMedidaId },
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
async function ajustarStock(req, res, next) {
  try {
    const { id } = req.params;
    const { tipo, cantidad, motivo } = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'id de producto inválido' });
    }
    if (!tipo || !['ENTRADA', 'SALIDA'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser ENTRADA o SALIDA' });
    }
    if (cantidad === undefined || isNaN(Number(cantidad)) || Number(cantidad) <= 0) {
      return res.status(400).json({ error: 'cantidad debe ser un número mayor a 0' });
    }
    if (!motivo || typeof motivo !== 'string' || motivo.trim() === '') {
      return res.status(400).json({ error: 'El motivo es obligatorio' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findFirst({
        where: { id: Number(id), comercioId: req.comercioId },
      });
      
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      if (tipo === 'SALIDA' && producto.stockActual < cantidad) {
        throw new Error('La cantidad de salida supera el stock actual disponible');
      }

      const nuevoStock = tipo === 'ENTRADA' 
        ? producto.stockActual + Number(cantidad)
        : producto.stockActual - Number(cantidad);

      const actualizado = await tx.producto.update({
        where: { id: producto.id },
        data: { stockActual: nuevoStock }
      });

      await tx.movimientoStock.create({
        data: {
          productoId: producto.id,
          tipo,
          cantidad: Number(cantidad),
          motivo
        }
      });

      return actualizado;
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'La cantidad de salida supera el stock actual disponible') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { listar, buscarPorCodigoBarras, crear, actualizar, generarCodigoBarras, ajustarStock };
