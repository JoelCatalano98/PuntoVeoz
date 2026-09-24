const prisma = require('../src/config/prisma');
const arcaService = require('../src/services/arca.service');
const wsaaClient = require('../src/services/arca/wsaa.client');
const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log('--- INICIANDO PRUEBAS MANUALES DE ARCA (Nativo) ---');
    const comercio = await prisma.comercio.findFirst();
    if (!comercio) {
        console.error('No hay comercio configurado.');
        process.exit(1);
    }
    
    // Verificamos el modo
    const isProduction = comercio.arcaModo === 'produccion';
    console.log(`Comercio ID: ${comercio.id}, CUIT: ${comercio.arcaCuit}, MODO ACTUAL EN BD: ${comercio.arcaModo}`);
    console.log(`NOTA: Usando entorno dinámico basado en BD (isProduction: ${isProduction})`);

    const certPath = path.resolve(__dirname, '../certs/arca.crt');
    const keyPath = path.resolve(__dirname, '../certs/arca.key');

    console.log('\n>>> PASO 1: Generación y Firma del TRA en memoria');
    const certContent = fs.readFileSync(certPath, 'utf8');
    const keyContent = fs.readFileSync(keyPath, 'utf8');
    
    const tra = wsaaClient.generarTRA('wsfe');
    console.log('[TRA XML Generado]:\n', tra);

    const cms = wsaaClient.firmarTRA(tra, certContent, keyContent);
    console.log('\n[CMS Firmado (primeros 100 caracteres)]:\n', cms.substring(0, 100) + '...');

    console.log('\n>>> PASO 2: Obtener Token y Cachearlo (WSAA)');
    // Borramos caché previo para forzar petición
    await prisma.arcaToken.deleteMany({ where: { comercioId: comercio.id } });
    
    let auth;
    try {
        auth = await wsaaClient.getToken({
            comercioId: comercio.id,
            certPath,
            keyPath,
            isProduction: isProduction,
            service: 'wsfe'
        });
        console.log('\n[Respuesta WSAA Parseada]:');
        console.log('- Token (primeros 50 chars):', auth.token.substring(0, 50) + '...');
        console.log('- Sign (primeros 50 chars):', auth.sign.substring(0, 50) + '...');
        console.log('- Expiración:', auth.expirationTime);

        console.log('\n>>> PASO 3: FEDummy a través de WsfeClient');
        const WsfeClient = require('../src/services/arca/wsfe.client');
        const wsfe = new WsfeClient(isProduction);
        const cuit = Number(comercio.arcaCuit.replace(/[^0-9]/g, ''));
        
        const dummyResult = await wsfe.FEDummy();
        console.log('[FEDummyResult]:', dummyResult);

        console.log('\n>>> PASO 4: FECompUltimoAutorizado real');
        const ptoVta = comercio.arcaPtoVta || 1;
        const ultimoCmp = await wsfe.FECompUltimoAutorizado({ token: auth.token, sign: auth.sign, cuit, ptoVta, cbteTipo: 11 });
        console.log(`[Último Comprobante Tipo 11 PtoVta ${ptoVta}]: ${ultimoCmp}`);

        console.log('\n>>> PASO 5: FECAESolicitar real en Homologación (Datos de prueba)');
        try {
            const lastVoucher = await wsfe.FECompUltimoAutorizado({ token: auth.token, sign: auth.sign, cuit, ptoVta, cbteTipo: 11 });
            const nroFactura = lastVoucher + 1;
            const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');

            const payload = {
                CantReg: 1, PtoVta: ptoVta, CbteTipo: 11, Concepto: 1, DocTipo: 99, DocNro: 0,
                CbteDesde: nroFactura, CbteHasta: nroFactura, CbteFch: parseInt(date),
                ImpTotal: 10.00, ImpTotConc: 0, ImpNeto: 10.00, ImpOpEx: 0, ImpIVA: 0, ImpTrib: 0, MonId: 'PES', MonCotiz: 1
            };
            const resultFactura = await wsfe.FECAESolicitar({ token: auth.token, sign: auth.sign, cuit, payload });
            console.log('[FECAESolicitar Exitoso]:', resultFactura);
        } catch (e) {
            console.log('[FECAESolicitar Error]:', e.message);
        }

        console.log('\n>>> PRUEBA ERROR 2: Error SOAP real (Monto Negativo en FECAESolicitar)');
        try {
            const lastVoucher = await wsfe.FECompUltimoAutorizado({ token: auth.token, sign: auth.sign, cuit, ptoVta, cbteTipo: 11 });
            const nroFactura = lastVoucher + 1;
            const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');

            const payloadInvalido = {
                CantReg: 1, PtoVta: ptoVta, CbteTipo: 11, Concepto: 1, DocTipo: 99, DocNro: 0,
                CbteDesde: nroFactura, CbteHasta: nroFactura, CbteFch: parseInt(date),
                ImpTotal: -100, ImpTotConc: 0, ImpNeto: -100, ImpOpEx: 0, ImpIVA: 0, ImpTrib: 0, MonId: 'PES', MonCotiz: 1
            };
            await wsfe.FECAESolicitar({ token: auth.token, sign: auth.sign, cuit, payload: payloadInvalido });
            console.log('FALLÓ: La factura se procesó a pesar de ser inválida.');
        } catch (e) {
            console.log('[Éxito] Error SOAP capturado de ARCA:', e.message);
        }

    } catch (error) {
        console.log('[ERROR FATAL WSAA] No se obtuvo token, omitiendo pruebas de WSFE:', error.message);
    }

    console.log('\n>>> PRUEBA ERROR 1: Faltan archivos de certificados');
    const backupCert = certPath + '.bak';
    if (fs.existsSync(certPath)) fs.renameSync(certPath, backupCert);
    
    await prisma.arcaToken.deleteMany({ where: { comercioId: comercio.id } }); // Forzamos q no use caché
    try {
        await wsaaClient.getToken({ comercioId: comercio.id, certPath, keyPath, isProduction: isProduction, service: 'wsfe' });
        console.log('FALLÓ: Pasó sin error incluso faltando el certificado.');
    } catch (e) {
        console.log('[Éxito] Error capturado correctamente:', e.message);
    }
    
    if (fs.existsSync(backupCert)) fs.renameSync(backupCert, certPath); // Restauramos

    console.log('\n--- PRUEBAS FINALIZADAS ---');
    await prisma.$disconnect();
}

runTests();
