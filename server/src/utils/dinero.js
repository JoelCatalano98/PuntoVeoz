const Decimal = require('decimal.js');

/**
 * Todos los cálculos de dinero de la app pasan por Decimal.js,
 * nunca por operaciones directas con Number/Float.
 * Prisma devuelve los campos Decimal como objetos Decimal-like;
 * estas funciones normalizan y operan de forma segura.
 */

function toDecimal(value) {
  return new Decimal(value ?? 0);
}

function sumar(...valores) {
  return valores.reduce((acc, v) => acc.plus(toDecimal(v)), new Decimal(0));
}

function restar(a, b) {
  return toDecimal(a).minus(toDecimal(b));
}

function multiplicar(a, b) {
  return toDecimal(a).times(toDecimal(b));
}

/**
 * Calcula el vuelto de una venta. Lanza error si el monto recibido
 * no alcanza a cubrir el total (evita vueltos negativos silenciosos).
 */
function calcularVuelto(total, montoRecibido) {
  const t = toDecimal(total);
  const recibido = toDecimal(montoRecibido);
  if (recibido.lessThan(t)) {
    throw new Error('El monto recibido es menor al total de la venta');
  }
  return recibido.minus(t);
}

// Redondeo a 2 decimales para persistir/mostrar
function aDosDecimales(valor) {
  return toDecimal(valor).toDecimalPlaces(2).toNumber();
}

module.exports = {
  toDecimal,
  sumar,
  restar,
  multiplicar,
  calcularVuelto,
  aDosDecimales,
};
