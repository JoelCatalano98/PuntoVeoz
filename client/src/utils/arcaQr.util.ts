export const generarQrUrl = (venta: any, cuitEmpresa: string): string => {
  if (!venta || !venta.cae) return '';
  
  let ptoVtaNum = venta.puntoVenta?.numero || 1;
  let nroCmp = venta.id;
  if (venta.nroFactura) {
    nroCmp = Number(venta.nroFactura);
  }

  const cuitLimpio = (cuitEmpresa || '0').replace(/[^0-9]/g, '');

  let tipoCmp = 11; // Factura C por defecto
  if (venta.tipoComprobante === 'FACTURA_A') tipoCmp = 1;
  else if (venta.tipoComprobante === 'FACTURA_B') tipoCmp = 6;
  else if (venta.tipoComprobante === 'FACTURA_C') tipoCmp = 11;
  else if (venta.tipoComprobante === 'NOTA_CREDITO_A') tipoCmp = 3;
  else if (venta.tipoComprobante === 'NOTA_CREDITO_B') tipoCmp = 8;
  else if (venta.tipoComprobante === 'NOTA_CREDITO_C') tipoCmp = 13;

  const datosQR = {
    ver: 1,
    fecha: new Date(venta.createdAt).toISOString().split('T')[0],
    cuit: Number(cuitLimpio),
    ptoVta: ptoVtaNum,
    tipoCmp: tipoCmp,
    nroCmp: nroCmp,
    importe: Number(venta.total),
    moneda: "PES",
    ctz: 1,
    tipoDocRec: venta.cliente?.numeroDoc ? (venta.cliente.numeroDoc.length === 11 ? 80 : 96) : 99,
    nroDocRec: Number(venta.cliente?.numeroDoc || 0),
    tipoCodAut: "E",
    codAut: Number(venta.cae)
  };

  const qrBase64 = btoa(JSON.stringify(datosQR));
  return `https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`;
};
