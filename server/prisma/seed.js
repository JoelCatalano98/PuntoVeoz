const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el seed...');

  // 1. Crear un Comercio base (el usuario requiere pertenecer a un comercio)
  const comercio = await prisma.comercio.upsert({
    where: { cuit: '30-12345678-9' },
    update: {},
    create: {
      nombre: 'Comercio Principal',
      razonSocial: 'Punto Veloz S.A.',
      cuit: '30-12345678-9'
    }
  });

  console.log(`✅ Comercio creado/obtenido: ${comercio.nombre} (ID: ${comercio.id})`);

  // 1.5. Crear Punto de Venta manual por defecto ("Mostrador")
  const puntoVenta = await prisma.puntoVenta.upsert({
    where: { id: 1 }, // Asumimos ID 1 para el primer punto de venta
    update: {},
    create: {
      comercioId: comercio.id,
      nombre: 'Mostrador',
      tipo: 'MANUAL'
    }
  });
  console.log(`✅ Punto de venta creado/obtenido: ${puntoVenta.nombre} (ID: ${puntoVenta.id})`);

  // 1.6. Crear Caja física ("Caja 1") asociada al Mostrador
  const caja = await prisma.caja.upsert({
    where: { 
      comercioId_prefijo: { comercioId: comercio.id, prefijo: 'C1' } 
    },
    update: {},
    create: {
      comercioId: comercio.id,
      puntoVentaId: puntoVenta.id,
      nombre: 'Caja 1',
      descripcion: 'Caja principal del mostrador',
      prefijo: 'C1'
    }
  });
  console.log(`✅ Caja creada/obtenida: ${caja.nombre} (Prefijo: ${caja.prefijo})`);

  // 2. Crear un Usuario (SUPERADMIN)
  const passwordHash = await bcrypt.hash('admin1234', 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: 'admin@puntoveloz.test' },
    update: {},
    create: {
      comercioId: comercio.id,
      nombre: 'Administrador',
      email: 'admin@puntoveloz.test',
      password: passwordHash,
      rol: 'SUPERADMIN'
    }
  });

  console.log(`✅ Usuario creado/obtenido: ${usuario.email} (Rol: ${usuario.rol})`);
  console.log(`🔑 Contraseña: admin1234`);

  // 3. Crear Parámetro por defecto: impresionTicket
  const parametro = await prisma.parametro.upsert({
    where: {
      comercioId_clave: { comercioId: comercio.id, clave: 'impresionTicket' }
    },
    update: {},
    create: {
      comercioId: comercio.id,
      clave: 'impresionTicket',
      valor: 'PREGUNTAR'
    }
  });
  console.log(`✅ Parámetro configurado: ${parametro.clave} = ${parametro.valor}`);

  console.log('🚀 Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
