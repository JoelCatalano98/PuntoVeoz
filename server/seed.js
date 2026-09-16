const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const comercio = await prisma.comercio.upsert({
    where: { cuit: '20111111112' },
    update: {},
    create: {
      nombre: 'Comercio de Prueba',
      razonSocial: 'Comercio de Prueba SRL',
      cuit: '20111111112',
    },
  });

  const passwordHasheado = await bcrypt.hash('admin1234', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@puntoveloz.test' },
    update: {},
    create: {
      comercioId: comercio.id,
      nombre: 'Admin de Prueba',
      email: 'admin@puntoveloz.test',
      password: passwordHasheado,
      rol: 'ADMIN',
    },
  });

  console.log('Seed OK');
  console.log('Comercio:', comercio.id, comercio.nombre);
  console.log('Usuario admin:', admin.email, '(password: admin1234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
