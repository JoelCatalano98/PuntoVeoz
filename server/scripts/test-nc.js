const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const v = await prisma.venta.findFirst({
    where: {estado: 'COMPLETADA', cae: {not: null}},
    orderBy: {id: 'desc'},
    include: {puntoVenta: true}
  });
  console.log('Ultima venta con CAE:', v ? v.id : 'None');
  
  if(v) {
    console.log('Emitiendo NC para la venta:', v.id);
    const ventaService = require('../src/services/venta.service');
    try {
      const nc = await ventaService.emitirNotaCreditoTotal(v.comercioId, v.usuarioId, v.id);
      console.log('NC Emitida:', nc);
    } catch (e) {
      console.error('Error al emitir NC:', e.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
