const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const ptos = await prisma.puntoVenta.findMany();
  console.log("--- PUNTO VENTA ---");
  console.log(JSON.stringify(ptos, null, 2));

  const ventas = await prisma.venta.findMany({
    select: {
      id: true,
      puntoVentaId: true,
      cae: true,
      vtoCae: true, // Wait, schema has vtoCae and vencimientoCae? I saw both. Let me select both.
      vencimientoCae: true,
      estadoFiscal: true,
      tipoComprobante: true
    }
  });
  console.log("--- VENTAS ---");
  console.log(JSON.stringify(ventas, null, 2));
}

run().finally(() => prisma.$disconnect());
