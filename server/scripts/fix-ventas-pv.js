const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the WEBSERVICE point of sale
  const wsPv = await prisma.puntoVenta.findFirst({
    where: { tipo: 'WEBSERVICE' }
  });

  if (!wsPv) {
    console.log("No se encontro Punto Venta WEBSERVICE");
    return;
  }

  // Find all manual point of sales
  const manualPvs = await prisma.puntoVenta.findMany({
    where: { tipo: 'MANUAL' },
    select: { id: true }
  });
  const manualPvIds = manualPvs.map(p => p.id);

  // Update sales with CAE and manual puntoVenta
  const result = await prisma.venta.updateMany({
    where: {
      cae: { not: null },
      puntoVentaId: { in: manualPvIds }
    },
    data: {
      puntoVentaId: wsPv.id
    }
  });

  console.log(`Actualizadas ${result.count} ventas con CAE que tenian Punto de Venta MANUAL al WEBSERVICE (ID ${wsPv.id}).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
