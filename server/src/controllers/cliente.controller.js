const prisma = require('../config/prisma');
const axios = require('axios');
async function listar(req, res) {
  const { search, busqueda, page = 1, limit = 50 } = req.query;
  const q = search || busqueda;
  
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const whereClause = { comercioId: req.comercioId, activo: true };
  if (q) {
    whereClause.OR = [
      { nombre: { contains: q } },
      { numeroDoc: { contains: q } },
      { razonSocial: { contains: q } }
    ];
  }

  const [totalCount, clientes] = await prisma.$transaction([
    prisma.cliente.count({ where: whereClause }),
    prisma.cliente.findMany({
      where: whereClause,
      orderBy: { nombre: 'asc' },
      skip,
      take: limitNum
    })
  ]);

  res.json({
    data: clientes,
    totalCount,
    totalPages: Math.ceil(totalCount / limitNum)
  });
}

async function crear(req, res) {
  const { nombre, razonSocial, tipoDoc, numeroDoc, telefono, email, direccion, condicionIva } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const cliente = await prisma.cliente.create({
    data: {
      comercioId: req.comercioId,
      nombre,
      razonSocial,
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

  const { nombre, razonSocial, tipoDoc, numeroDoc, telefono, email, direccion, condicionIva, activo } = req.body;
  const actualizado = await prisma.cliente.update({
    where: { id: cliente.id },
    data: { nombre, razonSocial, tipoDoc, numeroDoc, telefono, email, direccion, condicionIva, activo },
  });

  res.json(actualizado);
}

const padronClient = require('../services/arca/padron.client');

async function consultarPadron(req, res) {
  try {
    const { cuit } = req.params;
    console.log(`Llegó petición al backend para consultar padrón de CUIT: ${cuit}`);
    if (!cuit || cuit.length !== 11) {
      return res.status(400).json({ error: 'CUIT inválido. Debe tener 11 dígitos.' });
    }
    
    // Obtener el comercio para sacar el CUIT representada y el modo (isProduction)
    const comercio = await prisma.comercio.findUnique({ where: { id: req.comercioId } });
    if (!comercio || !comercio.arcaCuit) {
        return res.status(200).json({ success: false, error: 'El comercio no tiene CUIT configurado para ARCA.' });
    }

    const cuitRepresentada = comercio.arcaCuit;
    const isProduction = comercio.arcaModo === 'produccion';

    console.log('Llamando al WS oficial de ARCA (PersonaServiceA5)...');
    
    const result = await padronClient.consultarCUIT(req.comercioId, cuit, cuitRepresentada, isProduction);
    
    // Devolvemos 200 siempre para que el frontend ataje el success: false amigablemente
    res.status(200).json(result);
  } catch (error) {
    console.error('Error al consultar padrón', error.message);
    res.status(200).json({ success: false, error: 'Error interno al consultar AFIP.', details: error.message });
  }
}

module.exports = { listar, crear, actualizar, consultarPadron };
