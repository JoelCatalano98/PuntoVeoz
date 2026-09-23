const prisma = require('../src/config/prisma');

async function test() {
    try {
        const c = await prisma.comercio.findFirst();
        console.log('Comercio:', c.id);
        console.log('arcaCertEncrypted value:', c.arcaCertEncrypted);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
