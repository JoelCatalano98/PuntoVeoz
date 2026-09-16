require('dotenv').config();
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({userId: 1, comercioId: 1, rol: 'SUPERADMIN'}, process.env.JWT_SECRET);
  try {
    const res = await fetch('http://localhost:4000/api/cajas-maestro', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: 'Caja 2 (Test)',
        descripcion: 'Prueba desde script',
        prefijo: 'CX',
        puntoVentaId: 1
      })
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', data);
  } catch (err) {
    console.error('❌ Error:', err);
  }
}
test();
