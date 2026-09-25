const arcaService = require('../src/services/arca.service');

async function main() {
  try {
    const comercioId = 1; // From DB
    const ptosVenta = await arcaService.obtenerPuntosVenta(comercioId);
    console.log("Puntos de venta de ARCA:", JSON.stringify(ptosVenta, null, 2));
  } catch (error) {
    console.error("Error al obtener puntos de venta:", error);
  }
}

main();
