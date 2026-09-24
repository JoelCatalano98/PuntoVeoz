const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.puntoVenta.update({
    where: { id: 1 },
    data: {
      numero: 1,
      descripcion: 'Talonario Manual / Interno'
    }
  });
  console.log("Punto de venta actualizado:", updated);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
