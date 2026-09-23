const { testArcaConnection } = require('../src/controllers/venta.controller');
const prisma = require('../src/config/prisma');

async function run() {
    console.log('--- TEST DEL CONTROLADOR testArcaConnection ---');
    const comercio = await prisma.comercio.findFirst();
    
    // Forzar a homologación en la BD tal como requirió el usuario para la prueba real
    if (comercio.arcaModo !== 'homologacion') {
        await prisma.comercio.update({
            where: { id: comercio.id },
            data: { arcaModo: 'homologacion' }
        });
        console.log('[Setup] Cambiado comercio.arcaModo a "homologacion" en BD.');
    }

    // Limpiar caché de token WSAA para que se vea el flujo completo
    await prisma.arcaToken.deleteMany({ where: { comercioId: comercio.id } });

    // Mock de Express req, res
    const req = { comercioId: comercio.id };
    const res = {
        json: (data) => {
            console.log('\n[RESPONSE JSON RAW]:');
            console.log(JSON.stringify(data, null, 2));
        },
        status: (code) => {
            console.log(`\n[RESPONSE STATUS CODE]: ${code}`);
            return res;
        }
    };

    console.log('[Ejecutando] testArcaConnection(req, res)...');
    
    // Ejecutar controlador
    await testArcaConnection(req, res, (err) => console.log('Siguiente middleware llamado con:', err));
    
    await prisma.$disconnect();
}

run();
