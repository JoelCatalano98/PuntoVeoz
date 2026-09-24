const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pv = await prisma.puntoVenta.findMany();
  console.log("Puntos de Venta:", pv);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
