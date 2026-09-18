const prisma = require('../config/prisma');

async function listar(req, res, next) {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { comercioId: req.comercioId, activo: true },
      orderBy: { razonSocial: 'asc' }
    });
    res.json(proveedores);
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const { id } = req.params;
    const proveedor = await prisma.proveedor.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const { razonSocial, cuit, telefono, email, direccion } = req.body;
    if (!razonSocial) return res.status(400).json({ error: 'La razón social es obligatoria' });

    const proveedor = await prisma.proveedor.create({
      data: {
        comercioId: req.comercioId,
        razonSocial,
        cuit,
        telefono,
        email,
        direccion
      }
    });
    res.status(201).json(proveedor);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { razonSocial, cuit, telefono, email, direccion } = req.body;

    const existe = await prisma.proveedor.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });
    if (!existe) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const proveedor = await prisma.proveedor.update({
      where: { id: Number(id) },
      data: { razonSocial, cuit, telefono, email, direccion }
    });
    res.json(proveedor);
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    
    const existe = await prisma.proveedor.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });
    if (!existe) return res.status(404).json({ error: 'Proveedor no encontrado' });

    // En lugar de borrar físicamente, desactivamos (soft delete)
    await prisma.proveedor.update({
      where: { id: Number(id) },
      data: { activo: false }
    });
    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar
};
