const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ventas = await prisma.venta.findMany({
    where: {
      cae: { not: null }
    },
    select: {
      id: true,
      nroFactura: true,
      puntoVentaId: true,
      cae: true,
      tipoComprobante: true
    }
  });
  console.log(ventas);
}
check().finally(() => prisma.$disconnect());
