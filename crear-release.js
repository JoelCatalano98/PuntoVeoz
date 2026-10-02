const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;
// Se creará fuera del repositorio para mantenerlo aislado
const RELEASE_DIR = path.join(PROJECT_ROOT, '../PuntoVeloz_Produccion');

/**
 * Copia recursivamente directorios omitiendo carpetas o extensiones específicas.
 */
function copyDirSync(src, dest, excludeDirs = [], excludeExt = []) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;
        
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath, excludeDirs, excludeExt);
        } else {
            const ext = path.extname(entry.name);
            if (excludeExt.includes(ext)) continue;
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function init() {
    console.log('🚀 Iniciando proceso de release...');
    
    // 1. Compilación del frontend
    console.log('📦 Compilando el frontend (npm run build)...');
    try {
        execSync('npm run build', { cwd: path.join(PROJECT_ROOT, 'client'), stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Error al compilar el frontend:', error.message);
        process.exit(1);
    }

    // 2. Preparar carpeta de destino
    console.log(`📁 Creando entorno aislado en ${RELEASE_DIR}...`);
    if (fs.existsSync(RELEASE_DIR)) {
        fs.rmSync(RELEASE_DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    }
    fs.mkdirSync(RELEASE_DIR, { recursive: true });

    // 3. Copiar Backend (incluye prisma, pero excluye bases de datos, envs y node_modules)
    console.log('📂 Copiando archivos del backend y limpiando residuos de desarrollo...');
    copyDirSync(
        path.join(PROJECT_ROOT, 'server'), 
        path.join(RELEASE_DIR, 'server'), 
        ['node_modules', '.env', '.env.local', 'logs', '.git', '.vscode'], // Exclusiones de carpetas/archivos
        ['.db', '.sqlite', '.db-journal'] // Exclusiones de bases de datos locales
    );

    // 4. Copiar Frontend Compilado (solo la carpeta /dist)
    console.log('📂 Copiando build del frontend...');
    fs.mkdirSync(path.join(RELEASE_DIR, 'client'), { recursive: true });
    copyDirSync(
        path.join(PROJECT_ROOT, 'client', 'dist'), 
        path.join(RELEASE_DIR, 'client', 'dist')
    );

    // 5. Copiar scripts ejecutables (.bat)
    console.log('📂 Copiando instalador interactivo (instalar.bat)...');
    fs.copyFileSync(
        path.join(PROJECT_ROOT, 'instalar.bat'),
        path.join(RELEASE_DIR, 'instalar.bat')
    );
    
    console.log('📂 Copiando forzador de backup manual (forzar-backup.bat)...');
    if (fs.existsSync(path.join(PROJECT_ROOT, 'forzar-backup.bat'))) {
        fs.copyFileSync(
            path.join(PROJECT_ROOT, 'forzar-backup.bat'),
            path.join(RELEASE_DIR, 'forzar-backup.bat')
        );
    }

    // 6. Copiar script de semilla (seed-admin.js) explícitamente
    console.log('📂 Copiando script de semilla (seed-admin.js)...');
    if (fs.existsSync(path.join(PROJECT_ROOT, 'server', 'seed-admin.js'))) {
        fs.copyFileSync(
            path.join(PROJECT_ROOT, 'server', 'seed-admin.js'),
            path.join(RELEASE_DIR, 'server', 'seed-admin.js')
        );
    }
    
    console.log('✅ Release generado exitosamente en:', RELEASE_DIR);
}

init();
