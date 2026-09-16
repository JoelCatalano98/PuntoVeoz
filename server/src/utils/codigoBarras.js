/**
 * Calcula el dígito verificador para un código EAN-13 (base de 12 dígitos).
 * El algoritmo suma alternadamente multiplicando por 1 y por 3.
 */
function calcularDigitoVerificadorEAN13(doceDigitos) {
  if (doceDigitos.length !== 12) {
    throw new Error('El código base debe tener exactamente 12 dígitos numéricos.');
  }

  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(doceDigitos[i], 10);
    // En 0-index, los índices pares (0, 2, 4...) corresponden a posiciones impares 
    // en 1-index (que multiplican por 1), y los índices impares a posiciones pares (x3).
    suma += i % 2 === 0 ? digito * 1 : digito * 3;
  }

  const modulo = suma % 10;
  const digitoVerificador = modulo === 0 ? 0 : 10 - modulo;
  
  return digitoVerificador;
}

/**
 * Genera un código de barras EAN-13 para uso interno.
 * Usa el prefijo "20" (reservado para uso interno) y el ID del producto.
 */
function generarCodigoInterno(productoId) {
  const prefijo = "20";
  // Rellena con ceros hasta llegar a los 10 dígitos faltantes (2 + 10 = 12 dígitos)
  const idFormateado = String(productoId).padStart(10, '0');
  const doceDigitos = prefijo + idFormateado;
  
  const digitoVerificador = calcularDigitoVerificadorEAN13(doceDigitos);
  return doceDigitos + digitoVerificador;
}

module.exports = {
  calcularDigitoVerificadorEAN13,
  generarCodigoInterno
};
