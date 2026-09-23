const fs = require('fs');
const path = require('path');
const { postArcaConfig } = require('../src/controllers/comercio.controller');
const { testArcaConnection } = require('../src/controllers/venta.controller');
const { requireRole } = require('../src/middlewares/auth.middleware');
const prisma = require('../src/config/prisma');

async function run() {
    console.log('--- TEST: SUBIDA Y USO DE CERTIFICADO DESDE LA BD ---');
    const comercio = await prisma.comercio.findFirst();

    // 1. Leer los archivos reales y moverlos
    const certPath = path.join(__dirname, '../certs/arca.crt');
    const keyPath = path.join(__dirname, '../certs/arca.key');
    const certBak = certPath + '.bak';
    const keyBak = keyPath + '.bak';

    if (fs.existsSync(certPath)) fs.renameSync(certPath, certBak);
    if (fs.existsSync(keyPath)) fs.renameSync(keyPath, keyBak);

    const certContent = fs.readFileSync(certBak, 'utf8');
    const keyContent = fs.readFileSync(keyBak, 'utf8');

    // 2. Probar acceso CAJERO
    console.log('\n[PRUEBA 1]: Usuario SIN rol SUPERADMIN intentando acceder a /comercio/arca-config');
    const reqCajero = { usuario: { rol: 'CAJERO' } };
    let cajeroRes = { status: (c) => ({ json: (d) => console.log('Rechazado con Status', c, '->', d) }) };
    const middleware = requireRole('SUPERADMIN');
    middleware(reqCajero, cajeroRes, () => console.log('Esto no deberia ejecutarse!'));

    // 3. Probar POST fallido (Módulo inválido)
    console.log('\n[PRUEBA 2]: POST con llave y cert no coincidentes');
    // Le paso la llave correcta pero el certificado lo rompo simulando uno distinto
    const fakeCert = certContent.replace(/A/g, 'B'); 
    const reqPostFail = { 
        comercioId: comercio.id,
        body: { cert: fakeCert, key: keyContent, cuit: comercio.arcaCuit, modo: 'homologacion', ptoVta: 1 }
    };
    const resPostFail = {
        json: (data) => console.log('\n[RESPONSE JSON RAW]:', data),
        status: (code) => { console.log('[STATUS CODE]:', code); return resPostFail; }
    };
    await postArcaConfig(reqPostFail, resPostFail, console.error);

    // 4. Probar POST exitoso con superadmin
    console.log('\n[PRUEBA 3]: POST exitoso con certificados válidos coincidentes');
    const reqPost = { 
        comercioId: comercio.id,
        body: { cert: certContent, key: keyContent, cuit: comercio.arcaCuit, modo: 'homologacion', ptoVta: 1 }
    };
    
    const resPost = {
        json: (data) => { console.log('\n[RESPONSE JSON RAW]:', data); },
        status: (code) => { return resPost; }
    };
    await postArcaConfig(reqPost, resPost, console.error);

    // 5. Probar conexion WSFE (que leera desde la BD)
    console.log('\n[PRUEBA 4]: Probar Conexión ARCA después de cargar a BD (certificados en disco RENOMBRADOS)');
    const reqGet = { comercioId: comercio.id };
    const resGet = {
        json: (data) => console.log('\n[RESPONSE TEST ARCA JSON RAW]:', data),
        status: (code) => { return resGet; }
    };
    await testArcaConnection(reqGet, resGet, console.error);

    // 6. Verificar logs y base de datos cifrada
    const dbRecord = await prisma.comercio.findUnique({ where: { id: comercio.id } });
    console.log('\n[PRUEBA 5]: Revisión en crudo de BD (¿Contiene texto plano?)');
    console.log('arcaCertEncrypted empieza con -----BEGIN?:', dbRecord.arcaCertEncrypted.startsWith('-----BEGIN'));
    console.log('arcaKeyEncrypted empieza con -----BEGIN?:', dbRecord.arcaKeyEncrypted.startsWith('-----BEGIN'));
    console.log('Muestra de arcaCertEncrypted en BD:', dbRecord.arcaCertEncrypted.substring(0, 50));
    
    // Restaurar archivos
    if (fs.existsSync(certBak)) fs.renameSync(certBak, certPath);
    if (fs.existsSync(keyBak)) fs.renameSync(keyBak, keyPath);

    await prisma.$disconnect();
}
run();
