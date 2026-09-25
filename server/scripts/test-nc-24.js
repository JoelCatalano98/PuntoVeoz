const { emitirNotaCreditoTotal } = require('../src/services/venta.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const comercio = await prisma.comercio.findFirst();
  const venta = await prisma.venta.findUnique({ where: { id: 24 } });
  
  if (!venta) {
    console.log("Venta 24 no encontrada");
    return;
  }
  
  console.log("Emitiendo NC para venta 24...");
  try {
    const nc = await emitirNotaCreditoTotal(comercio.id, venta.usuarioId, 24);
    console.log("NC Emitida con éxito:", nc);
  } catch (err) {
    console.error("Error al emitir NC:", err.message);
  }
}

run().finally(() => prisma.$disconnect());
