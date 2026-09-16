const prisma = require('../config/prisma');

async function listar(req, res) {
  const puntosVenta = await prisma.puntoVenta.findMany({
    where: { comercioId: req.comercioId, activo: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(puntosVenta);
}

async function crear(req, res) {
  const { nombre, tipo } = req.body; // numeroArca intencionalmente ignorado

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const puntoVenta = await prisma.puntoVenta.create({
    data: {
      comercioId: req.comercioId,
      nombre,
      tipo: tipo || 'MANUAL', // 'MANUAL' es el default en prisma, nos aseguramos acá también si mandan null/vacio
    },
  });

  res.status(201).json(puntoVenta);
}

async function actualizar(req, res) {
  const { id } = req.params;
  const puntoVenta = await prisma.puntoVenta.findFirst({
    where: { id: Number(id), comercioId: req.comercioId },
  });
  
  if (!puntoVenta) return res.status(404).json({ error: 'Punto de venta no encontrado' });

  const { nombre, tipo, activo } = req.body;
  const actualizado = await prisma.puntoVenta.update({
    where: { id: puntoVenta.id },
    data: { nombre, tipo, activo },
  });

  res.json(actualizado);
}

module.exports = { listar, crear, actualizar };
