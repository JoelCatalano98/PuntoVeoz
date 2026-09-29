const Service = require('node-windows').Service;
const path = require('path');

console.log('⏳ Preparando instalación del Servicio de Windows...');

const svc = new Service({
  name: 'Punto Veloz Backend',
  description: 'Servidor backend y frontend (estáticos) para el sistema Punto Veloz',
  script: path.join(__dirname, 'src', 'server.js'),
  env: [{
    name: "NODE_ENV",
    value: "production"
  }],
  wait: 2,
  grow: .5,
  maxRestarts: 3
});

svc.on('install', () => {
  console.log('✅ Servicio "Punto Veloz Backend" instalado correctamente.');
  svc.start();
  console.log('🚀 Servicio iniciado. El sistema está corriendo en segundo plano.');
});

svc.on('alreadyinstalled', () => {
  console.log('⚠️ El servicio ya se encuentra instalado en esta computadora.');
});

svc.on('error', (err) => {
    console.error('❌ Error instalando el servicio:', err);
});

svc.install();
