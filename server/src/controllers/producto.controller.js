const prisma = require('../config/prisma');
const xlsx = require('xlsx');
const fs = require('fs');

async function listar(req, res) {
  const { busqueda, search, categoriaId, proveedorId, precioMin, precioMax, precioExacto, fechaDesde, fechaHasta, page = 1, limit = 50 } = req.query;
  const q = busqueda || search;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {
    comercioId: req.user.comercioId,
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
    where: { comercioId: req.user.comercioId, codigoBarras: codigo, activo: true },
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
        comercioId: req.user.comercioId,
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
          comercioId: req.user.comercioId,
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
    where: { id: Number(id), comercioId: req.user.comercioId },
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
      where: { id: Number(id), comercioId: req.user.comercioId },
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

async function importarExcel(req, res, next) {
  let filePath = '';
  try {
    if (!req.file) return res.status(400).json({ error: 'Debe enviar un archivo Excel' });
    
    const comercioId = req.user.comercioId;
    filePath = req.file.path;
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    
    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      const clean = String(val).replace(/\./g, '').replace(/,/g, '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };
    
    let categoriasGuardadas = await prisma.categoria.findMany({ where: { comercioId } });
    const catMap = new Map();
    categoriasGuardadas.forEach(c => catMap.set(c.nombre.toLowerCase(), c.id));
    
    let unidadesGuardadas = await prisma.unidadMedida.findMany({ where: { comercioId } });
    const unitMap = new Map();
    unidadesGuardadas.forEach(u => unitMap.set(u.nombre.toLowerCase(), u.id));
    
    let processed = 0;
    
    // Filtrar filas fantasma
    const filasValidas = rows.filter(row => {
      const keys = Object.keys(row);
      const findKey = (search) => keys.find(k => k.toLowerCase().includes(search));
      const n = row[findKey('nombre') || findKey('descripci')];
      const c = row[findKey('código') || findKey('codigo')];
      return n || c;
    });

    for (const row of filasValidas) {
      // Mapeo flexible de columnas (minúsculas y sin espacios extras para matchear)
      const keys = Object.keys(row);
      const findKey = (search) => keys.find(k => k.toLowerCase().includes(search));
        
        const nombre = row[findKey('nombre') || findKey('descripci')] || '';
        const codigoBarras = row[findKey('código') || findKey('codigo')] || '';
        const costo = parseNumber(row[findKey('costo')]);
        const precio = parseNumber(row[findKey('precio')]);
        const catNombre = String(row[findKey('categoría') || findKey('categoria')] || 'General').trim();
        const subcatNombre = String(row[findKey('subcategoría') || findKey('subcategoria')] || '').trim();
        const unidadNombre = String(row[findKey('unidad') || findKey('medida')] || 'Unidad').trim();
        const stockActual = parseNumber(row[findKey('stock actual') || findKey('actual')]);
        const stockMinimo = parseNumber(row[findKey('stock mínimo') || findKey('stock minimo') || findKey('minimo')]);
        
        if (!nombre) continue; // Saltear si no hay nombre
        
        // 1. Unidad
        const uKey = unidadNombre.toLowerCase();
        let unidadId = unitMap.get(uKey);
        if (!unidadId) {
          const newUnit = await prisma.unidadMedida.create({ data: { comercioId, nombre: unidadNombre } });
          unitMap.set(uKey, newUnit.id);
          unidadId = newUnit.id;
        }
        
        // 2. Categoria Padre
        const cKey = catNombre.toLowerCase();
        let catId = catMap.get(cKey);
        if (!catId) {
          const newCat = await prisma.categoria.create({ data: { comercioId, nombre: catNombre, color: '#3b82f6' } });
          catMap.set(cKey, newCat.id);
          catId = newCat.id;
        }
        
        // 3. Subcategoria
        let finalCatId = catId;
        if (subcatNombre) {
          const scKey = subcatNombre.toLowerCase();
          let subCatId = catMap.get(scKey); // Buscamos si existe
          // Verificamos si realmente es subcategoria de esta
          if (!subCatId) {
            const newSubCat = await prisma.categoria.create({ data: { comercioId, nombre: subcatNombre, color: '#64748b', categoriaPadreId: catId } });
            catMap.set(scKey, newSubCat.id);
            subCatId = newSubCat.id;
          }
          finalCatId = subCatId;
        }
        
        // 4. Upsert Producto
        // Si hay código de barras, intentamos buscar por él. Si no, por nombre.
        let prodExistente = null;
        if (codigoBarras) {
          prodExistente = await prisma.producto.findFirst({ where: { comercioId, codigoBarras: String(codigoBarras) } });
        }
        if (!prodExistente && nombre) {
          prodExistente = await prisma.producto.findFirst({ where: { comercioId, nombre } });
        }
        
        const dataProducto = {
          comercioId,
          nombre,
          codigoBarras: String(codigoBarras) || null,
          precioCosto: costo,
          precioVenta: precio,
          stockActual: stockActual,
          stockMinimo: stockMinimo,
          categoriaId: finalCatId,
          unidadMedidaId: unidadId
        };
        
        if (prodExistente) {
          await prisma.producto.update({ where: { id: prodExistente.id }, data: dataProducto });
        } else {
          await prisma.producto.create({ data: dataProducto });
        }
        processed++;
      }
    
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'Importación finalizada con éxito', processed });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(error);
  }
}

module.exports = { listar, buscarPorCodigoBarras, crear, actualizar, generarCodigoBarras, importarExcel };
