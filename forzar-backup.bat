@echo off
cd /d "%~dp0"
echo ====================================================
echo      PUNTO VELOZ - BACKUP MANUAL
echo ====================================================
echo.
echo Iniciando proceso de volcado de base de datos...
cd server
node -e "require('dotenv').config({ override: true, path: require('path').join(process.cwd(), '.env') }); require('./src/services/backup.service').realizarBackup(); setTimeout(() => console.log('\nPresiona una tecla para salir...'), 3000);"
pause >nul
