const prisma = require('../config/prisma');

async function listar(req, res) {
  const { busqueda, search, categoriaId, proveedorId, precioMin, precioMax, precioExacto, fechaDesde, fechaHasta, page = 1, limit = 50 } = req.query;
  const q = busqueda || search;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {
    comercioId: req.comercioId,
    activo: true
  };

  if (categoriaId) {
    whereClause.categoriaId = Number(categoriaId);
  }

  if (proveedorId) {
    whereClause.proveedorId = Number(proveedorId);
  }

  if (q) {
    whereClause.OR = [
      { nombre: { contains: q } },
      { codigoBarras: { contains: q } }
    ];
  }

  if (precioExacto) {
    whereClause.precioVenta = Number(precioExacto);
  } else if (precioMin || precioMax) {
    whereClause.precioVenta = {};
    if (precioMin) whereClause.precioVenta.gte = Number(precioMin);
    if (precioMax) whereClause.precioVenta.lte = Number(precioMax);
  }

  if (fechaDesde || fechaHasta) {
    whereClause.createdAt = {};
    if (fechaDesde) whereClause.createdAt.gte = new Date(fechaDesde + 'T00:00:00.000Z');
    if (fechaHasta) whereClause.createdAt.lte = new Date(fechaHasta + 'T23:59:59.999Z');
  }

  const [totalCount, productos] = await prisma.$transaction([
    prisma.producto.count({ where: whereClause }),
    prisma.producto.findMany({
      where: whereClause,
      orderBy: { nombre: 'asc' },
      include: {
        categoria: { select: { id: true, nombre: true, color: true } },
        unidadMedida: { select: { id: true, nombre: true, abreviatura: true } },
        proveedor: { select: { id: true, razonSocial: true } }
      },
      skip,
      take: limitNum
    })
  ]);
  res.json({
    data: productos,
    totalCount,
    totalPages: Math.ceil(totalCount / limitNum)
  });
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
  const { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockActual, stockMinimo, categoriaId, unidadMedidaId, proveedorId, ivaIncluido, rentabilidad, stockIdeal } = req.body;
  const imagenUrl = req.file ? `/public/uploads/productos/${req.file.filename}` : null;

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
        precioCosto: precioCosto ? Number(precioCosto) : 0,
        precioVenta: Number(precioVenta),
        ivaIncluido: ivaIncluido === undefined ? true : (ivaIncluido === 'true' || ivaIncluido === true),
        rentabilidad: rentabilidad ? Number(rentabilidad) : null,
        stockIdeal: stockIdeal ? Number(stockIdeal) : null,
        stockActual: stockActual ? Number(stockActual) : 0,
        stockMinimo: stockMinimo ? Number(stockMinimo) : 0,
        categoriaId: categoriaId ? Number(categoriaId) : null,
        unidadMedidaId: unidadMedidaId ? Number(unidadMedidaId) : null,
        proveedorId: proveedorId ? Number(proveedorId) : null,
        imagenUrl
      },
    });

    if (stockActual > 0) {
      await tx.movimientoStock.create({
        data: {
          comercioId: req.comercioId,
          productoId: p.id,
          usuarioId: req.user.userId,
          tipo: 'ENTRADA',
          cantidad: stockActual,
          motivo: 'Carga Inicial',
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
  const { nombre, descripcion, codigoBarras, precioCosto, precioVenta, stockMinimo, activo, categoriaId, unidadMedidaId, proveedorId, ivaIncluido, rentabilidad, stockIdeal } = req.body;
  
  const dataToUpdate = {
    nombre, 
    descripcion, 
    codigoBarras,
    precioCosto: precioCosto !== undefined ? Number(precioCosto) : undefined,
    precioVenta: precioVenta !== undefined ? Number(precioVenta) : undefined,
    stockMinimo: stockMinimo !== undefined ? Number(stockMinimo) : undefined,
    stockIdeal: stockIdeal ? Number(stockIdeal) : null,
    ivaIncluido: ivaIncluido !== undefined ? (ivaIncluido === 'true' || ivaIncluido === true) : undefined,
    rentabilidad: rentabilidad ? Number(rentabilidad) : null,
    activo: activo !== undefined ? (activo === 'true' || activo === true) : undefined,
    categoriaId: categoriaId ? Number(categoriaId) : null,
    unidadMedidaId: unidadMedidaId ? Number(unidadMedidaId) : null,
    proveedorId: proveedorId ? Number(proveedorId) : null,
  };

  if (req.file) {
    dataToUpdate.imagenUrl = `/public/uploads/productos/${req.file.filename}`;
  }

  const actualizado = await prisma.producto.update({
    where: { id: producto.id },
    data: dataToUpdate,
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
