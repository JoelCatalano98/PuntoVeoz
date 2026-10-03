const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ptos = await prisma.puntoVenta.findMany();
  console.log(ptos);
}
check().finally(() => prisma.$disconnect());
