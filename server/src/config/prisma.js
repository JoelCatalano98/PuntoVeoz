const { PrismaClient } = require('@prisma/client');

// Instancia única de Prisma para toda la app (evitar crear múltiples
// conexiones en desarrollo con hot-reload)
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
