const padronClient = require('../src/services/arca/padron.client');
const prisma = require('../src/config/prisma');

async function run() {
    try {
        const comercioId = 1;
        const cuitRepresentada = '20414926305';
        const isProduction = true; // AFIP en producción

        const cuitsATestear = [
            { desc: 'AFIP (Estado / IVA No Alcanzado)', cuit: '33693450239' },
            { desc: 'Cruz Roja Argentina (Exento Real)', cuit: '30546033925' },
        ];

        for (const test of cuitsATestear) {
            console.log(`\n================================`);
            console.log(`Consultando ${test.desc} (CUIT: ${test.cuit})`);
            const res = await padronClient.consultarCUIT(comercioId, test.cuit, cuitRepresentada, isProduction);
            
            if (res.success) {
                console.log(`RESULTADO MAPEADO:`);
                console.log(`Nombre: ${res.nombre}`);
                console.log(`Condición IVA: ${res.condicionIva}`);
                console.log(`Dirección: ${res.direccion}`);
                
                // Mostrar solo los arrays de impuestos reales para evitar un log gigante
                console.log(`\nIMPUESTOS RAW (Regimen General):`);
                console.log(JSON.stringify(res._raw.datosRegimenGeneral?.impuesto || [], null, 2));
                
                console.log(`\nIMPUESTOS RAW (Monotributo):`);
                console.log(JSON.stringify(res._raw.datosMonotributo?.impuesto || [], null, 2));
            } else {
                console.log(`ERROR: ${res.error}`);
            }
        }

    } catch (e) {
        console.error('Error fatal', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
