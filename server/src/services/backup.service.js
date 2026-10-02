const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');
const { URL } = require('url');

const BACKUP_DIR = 'C:\\PuntoVeloz_Backups';
const RETENTION_DAYS = 7;

function iniciarCron() {
  // Asegurar que exista la carpeta de backups
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Programar a las 03:00 AM y 15:00 PM todos los días
  cron.schedule('0 3,15 * * *', () => {
    console.log('⏰ Ejecutando tarea programada: Backup de Base de Datos...');
    realizarBackup();
  });

  console.log('✅ Servicio de Backups Automáticos inicializado (03:00 y 15:00).');
}

function realizarBackup() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ Error: No se encontró DATABASE_URL en las variables de entorno.');
      return;
    }

    const parsedUrl = new URL(dbUrl);
    // Formato de dbUrl: mysql://root:password@localhost:3306/puntoveloz
    const user = parsedUrl.username;
    const password = parsedUrl.password;
    const host = parsedUrl.hostname;
    // parsedUrl.pathname tiene una barra inicial (ej: /puntoveloz)
    const database = parsedUrl.pathname.substring(1);

    // Formatear la fecha a YYYY-MM-DD_HH-mm-ss
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `backup-${fecha}_${hora}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Armar el comando mysqldump
    const passArg = password ? `-p"${password}"` : '';
    const cmd = `mysqldump -u ${user} ${passArg} -h ${host} ${database} > "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error al generar backup: ${error.message}`);
        return;
      }
      console.log(`✅ Backup generado exitosamente: ${filePath}`);
      limpiarBackupsAntiguos();
    });
  } catch (error) {
    console.error(`❌ Error inesperado en el proceso de backup: ${error.message}`);
  }
}

function limpiarBackupsAntiguos() {
  try {
    const archivos = fs.readdirSync(BACKUP_DIR);
    const ahora = Date.now();
    const tiempoRetencionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    archivos.forEach(archivo => {
      if (archivo.endsWith('.sql')) {
        const filePath = path.join(BACKUP_DIR, archivo);
        const stats = fs.statSync(filePath);
        
        if (ahora - stats.mtimeMs > tiempoRetencionMs) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Backup antiguo eliminado por retención (> 7 días): ${archivo}`);
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error al limpiar backups antiguos: ${error.message}`);
  }
}

module.exports = { iniciarCron, realizarBackup };
