import toast from 'react-hot-toast';

export const imprimirTicket = (venta: any) => {
  // En el futuro, esto enviará comandos ESC/POS a una impresora térmica.
  // Por ahora, simulamos la impresión.

  toast.success('Ticket enviado a impresión', {
    icon: '🖨️',
    style: { fontWeight: 'bold' }
  });

  const fecha = new Date(venta.createdAt).toLocaleString();
  const nombreComercio = 'Punto Veloz S.A.'; // A futuro se puede traer del estado global
  const cajero = venta.usuario?.nombre || 'Cajero';

  let lines = [];
  lines.push(`===================================`);
  lines.push(`       ${nombreComercio}`);
  lines.push(`===================================`);
  lines.push(`Fecha: ${fecha}`);
  lines.push(`Ticket N°: ${venta.id.toString().padStart(8, '0')}`);
  lines.push(`Cajero: ${cajero}`);
  if (venta.cliente) {
    lines.push(`Cliente: ${venta.cliente.nombre}`);
  }
  lines.push(`-----------------------------------`);
  lines.push(`CANT | DESCRIPCION        | SUBTOTAL`);
  
  venta.items.forEach((item: any) => {
    const qty = item.cantidad.toString().padEnd(4, ' ');
    const desc = item.producto.nombre.substring(0, 18).padEnd(18, ' ');
    const sub = `$${Number(item.subtotal).toFixed(2)}`.padStart(8, ' ');
    lines.push(`${qty} | ${desc} | ${sub}`);
  });
  
  lines.push(`-----------------------------------`);
  lines.push(`TOTAL: $${Number(venta.total).toFixed(2)}`);
  lines.push(`Medio de pago: ${venta.medioPago}`);
  if (venta.medioPago === 'EFECTIVO') {
    lines.push(`Abona con: $${Number(venta.montoRecibido).toFixed(2)}`);
    lines.push(`Vuelto: $${Number(venta.vuelto).toFixed(2)}`);
  }
  lines.push(`===================================`);
  lines.push(`      ¡Gracias por su compra!      `);
  lines.push(`===================================`);

  console.log(lines.join('\n'));
};
