const prisma = require('../config/prisma');

async function listar(req, res) {
  const clientes = await prisma.cliente.findMany({
    where: { comercioId: req.comercioId, activo: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(clientes);
}

async function crear(req, res) {
  const { nombre, tipoDoc, numeroDoc, telefono, email, direccion, condicionIva } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const cliente = await prisma.cliente.create({
    data: {
      comercioId: req.comercioId,
      nombre,
      tipoDoc,
      numeroDoc,
      telefono,
      email,
      direccion,
      condicionIva,
    },
  });

  res.status(201).json(cliente);
}

async function actualizar(req, res) {
  const { id } = req.params;
  const cliente = await prisma.cliente.findFirst({
    where: { id: Number(id), comercioId: req.comercioId },
  });
  
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const { nombre, tipoDoc, numeroDoc, telefono, email, direccion, condicionIva, activo } = req.body;
  const actualizado = await prisma.cliente.update({
    where: { id: cliente.id },
    data: { nombre, tipoDoc, numeroDoc, telefono, email, direccion, condicionIva, activo },
  });

  res.json(actualizado);
}

module.exports = { listar, crear, actualizar };
