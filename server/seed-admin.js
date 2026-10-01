const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando script de Seed...');

  const existingAdmin = await prisma.usuario.findUnique({
    where: { email: 'admin@puntoveloz.com' }
  });

  const plainPassword = 'Puntoveloz!!2026';
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  if (existingAdmin) {
    console.log('✅ El usuario administrador ya existe. Actualizando contraseña...');
    await prisma.usuario.update({
      where: { email: 'admin@puntoveloz.com' },
      data: { password: hashedPassword }
    });
    console.log(`Email:    ${existingAdmin.email}`);
    console.log(`Password: ${plainPassword}`);
    return;
  }

  let comercio = await prisma.comercio.findFirst();
  
  if (!comercio) {
    console.log('🏢 No se encontraron comercios. Creando Comercio Principal...');
    comercio = await prisma.comercio.create({
      data: {
        nombre: 'Sede Principal',
        razonSocial: 'Punto Veloz',
        activo: true
      }
    });
  }

  console.log('👤 Creando usuario administrador...');
  const newAdmin = await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      username: 'admin',
      email: 'admin@puntoveloz.com',
      password: hashedPassword,
      rol: 'SUPERADMIN', 
      comercioId: comercio.id,
      activo: true
    }
  });

  console.log('🎉 ¡Usuario administrador creado exitosamente!');
  console.log(`Email:    ${newAdmin.email}`);
  console.log(`Password: ${plainPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Ocurrió un error al ejecutar el seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
