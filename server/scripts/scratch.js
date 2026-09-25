const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.comercio.findFirst();
  console.log('Comercio:', c);

  // If arcaPtoVta is 1, let's update PuntoVenta ID 2 to have numero: 1
  if (c && c.arcaPtoVta) {
    console.log("Updating PuntoVenta ID 2 to numero:", c.arcaPtoVta);
    const updated = await prisma.puntoVenta.update({
      where: { id: 2 },
      data: { numero: c.arcaPtoVta, numeroArca: c.arcaPtoVta }
    });
    console.log("Punto de venta actualizado:", updated);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
