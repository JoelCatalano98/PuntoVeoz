@echo off
cd /d "%~dp0"

echo ====================================================
echo      ASISTENTE DE INSTALACION - PUNTO VELOZ
echo ====================================================
echo.

set /p MYSQL_PASS="Ingrese la contrasena del usuario root de MySQL: "

echo.
echo [1/5] Generando archivo de configuracion .env...

node -e "const fs=require('fs'); const pass = process.env.MYSQL_PASS || ''; const urlPass = encodeURIComponent(pass); fs.writeFileSync('server/.env', `PORT=4000\nDATABASE_URL=\"mysql://root:${urlPass}@localhost:3306/puntoveloz_produccion\"\nJWT_SECRET=\"clave_segura_jwt_123_qwe_asd\"\nCERT_ENCRYPTION_KEY=\"mi_clave_secreta_para_cert_32_b!\"\nPUNTO_VENTA_IMPRESION=5`);"

echo [2/5] Instalando dependencias del sistema...
cd server
call npm install --omit=dev

echo.
echo [3/5] Generando Base de Datos y Semilla Inicial...
call npx prisma db push
call node seed-admin.js

echo.
echo [4/5] Registrando Servicio de Windows de Auto-Arranque...
call node instalar-servicio.js

echo.
echo [5/5] Creando acceso directo en el Escritorio...
powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $s = $wshell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\PuntoVeloz.lnk'); $s.TargetPath = 'C:\Archivos de programa\Google\Chrome\Application\chrome.exe'; $s.Arguments = '--user-data-dir=\"C:\ChromePOS\" --app=http://localhost:4000 --kiosk-printing'; $s.IconLocation = '%~dp0client\dist\AccesoDirecto.ico'; $s.Save()"

echo.
echo ====================================================
echo  Instalacion Finalizada. El sistema ya esta en linea.
echo  Se ha creado el acceso directo "PuntoVeloz" en el escritorio.
echo  Ingrese desde su navegador a: http://localhost:4000
echo ====================================================
pause
