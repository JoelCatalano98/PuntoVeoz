const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const ncs = await prisma.venta.findMany({
    where: { OR: [{ tipoComprobante: { startsWith: 'NOTA_CREDITO_' } }, { estado: 'ANULADA' }] },
    orderBy: { id: 'desc' },
    include: { cliente: true }
  });
  console.log('NCs in DB:', ncs.length);
  console.log(JSON.stringify(ncs.map(v => ({ id: v.id, tipo: v.tipoComprobante, nro: v.nroFactura, cae: v.cae, cliente: v.cliente?.nombre, total: v.total, estado: v.estado })), null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
