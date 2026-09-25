const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const v = await prisma.venta.findFirst({
    where: {id: 31},
    include: {puntoVenta: true}
  });
  console.log('Venta 31 puntoVenta:', v.puntoVenta);
}

main().finally(() => prisma.$disconnect());
