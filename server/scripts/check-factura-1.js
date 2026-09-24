const prisma = require('../src/config/prisma');
const arcaService = require('../src/services/arca.service');

async function runTests() {
    console.log('--- INICIANDO AUDITORIA FECompConsultar ---');
    const comercio = await prisma.comercio.findFirst();
    if (!comercio) {
        console.error('No hay comercio configurado.');
        process.exit(1);
    }

    try {
        const { wsfe, token, sign, cuit } = await arcaService.getAuthTokens(comercio.id);
        
        console.log(`\nConsultando Factura C (11), PtoVta: 2, Nro: 1...`);
        const result = await wsfe.FECompConsultar({
            token,
            sign,
            cuit,
            ptoVta: 2,
            cbteTipo: 11,
            cbteNro: 1
        });
        
        console.log('\n[RESULTADO CRUDO DE AFIP]');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.log('\n[ERROR] No se pudo consultar:', error.message);
    }

    console.log('\n--- AUDITORIA FINALIZADA ---');
    await prisma.$disconnect();
}

runTests();
