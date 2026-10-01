const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPasswords() {
  const hashedPassword = await bcrypt.hash('Puntoveloz!!2026', 10);
  
  await prisma.usuario.updateMany({
    where: { username: { in: ['admin', 'agustina', 'user_1'] } },
    data: { password: hashedPassword, activo: true }
  });
  
  console.log("Contraseñas reseteadas a Puntoveloz!!2026");
}

resetPasswords().catch(console.error).finally(() => prisma.$disconnect());
