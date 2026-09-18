const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.producto.updateMany({
    where: {
      stockActual: 0
    },
    data: {
      stockActual: 100
    }
  });
  console.log(`Updated ${result.count} products to have 100 stock.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
