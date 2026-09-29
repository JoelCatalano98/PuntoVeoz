@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo      ASISTENTE DE INSTALACION - PUNTO VELOZ
echo ====================================================
echo.

set /p MYSQL_PASS="Ingrese la contrasena del usuario root de MySQL: "

echo.
echo [1/4] Generando archivo de configuracion .env...

(
echo PORT=4000
echo DATABASE_URL="mysql://root:%MYSQL_PASS%@localhost:3306/puntoveloz_produccion"
echo JWT_SECRET="clave_segura_jwt_123_qwe_asd"
echo CERT_ENCRYPTION_KEY="mi_clave_secreta_para_cert_32_b!"
) > server\.env

echo [2/4] Instalando dependencias del sistema...
cd server
call npm install --omit=dev

echo.
echo [3/4] Generando Base de Datos y Semilla Inicial...
call npx prisma db push
call node seed-admin.js

echo.
echo [4/4] Registrando Servicio de Windows de Auto-Arranque...
call node instalar-servicio.js

echo.
echo ====================================================
echo  Instalacion Finalizada. El sistema ya esta en linea.
echo  Ingrese desde su navegador a: http://localhost:4000
echo ====================================================
pause
