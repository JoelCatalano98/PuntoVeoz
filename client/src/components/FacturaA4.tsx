import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

interface FacturaA4Props {
  venta: any;
}

export const FacturaA4: React.FC<FacturaA4Props> = ({ venta }) => {
  const [empresaDatos, setEmpresaDatos] = useState({ razonSocial: 'Punto Veloz S.A.', cuit: '00000000000', direccion: '', condicionIva: '' });
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const [resRS, resCuit, resDir, resIva] = await Promise.all([
          api.get('/parametros/empresaRazonSocial'),
          api.get('/parametros/empresaCuit'),
          api.get('/parametros/empresaDireccion'),
          api.get('/parametros/empresaCondicionIva')
        ]);
        setEmpresaDatos({
          razonSocial: resRS.data?.valor || 'Punto Veloz S.A.',
          cuit: resCuit.data?.valor || '00000000000',
          direccion: resDir.data?.valor || '',
          condicionIva: resIva.data?.valor || ''
        });
      } catch (err) {
        console.error('Error al cargar datos empresa', err);
      }
    };
    fetchEmpresa();
  }, []);

  const generarQrUrl = () => {
    if (!venta.cae) return '';
    const ptoVta = 1;
    let ptoVtaNum = 1;
    let nroCmp = venta.id;
    if (venta.nroFactura) {
      const parts = venta.nroFactura.split('-');
      if (parts.length === 2) {
        ptoVtaNum = Number(parts[0]);
        nroCmp = Number(parts[1]);
      }
    }

    const datosQR = {
      ver: 1,
      fecha: new Date(venta.createdAt).toISOString().split('T')[0],
      cuit: Number(empresaDatos.cuit.replace(/[^0-9]/g, '')),
      ptoVta: ptoVtaNum,
      tipoCmp: 11, // Factura C (ajustar luego si es necesario)
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

  const qrUrl = generarQrUrl();

  return (
    <div className="hidden print:block absolute inset-0 bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', margin: '0 auto', fontSize: '10pt', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 0; background: white; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `}</style>

      {/* CABECERA (Header) */}
      <div className="border-2 border-black mb-2 flex relative rounded">
        {/* Letra Central */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center justify-start bg-white w-12 border-x-2 border-black border-b-2 h-16 rounded-b-md">
          <div className="text-3xl font-extrabold leading-none mt-2">C</div>
          <div className="text-[8px] font-bold mt-1 text-center">CÓD. 011</div>
        </div>

        {/* Caja Izquierda: Empresa */}
        <div className="flex-1 p-3 pr-8 flex flex-col justify-between">
          {!logoError ? (
            <img
              src="/Logoempresa.png"
              alt={empresaDatos.razonSocial}
              className="h-20 object-contain mb-4"
              onError={() => setLogoError(true)}
            />
          ) : (
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">{empresaDatos.razonSocial}</h2>
          )}
          <div>
            <p className="text-xs mb-1"><strong>Razón Social:</strong> {empresaDatos.razonSocial}</p>
            <p className="text-xs mb-1"><strong>Domicilio Comercial:</strong> {empresaDatos.direccion}</p>
            <p className="text-xs"><strong>Condición frente al IVA:</strong> {empresaDatos.condicionIva}</p>
          </div>
        </div>

        {/* Caja Derecha: Datos Comprobante */}
        <div className="flex-1 p-3 pl-10 border-l-2 border-transparent border-t-0 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">FACTURA</h1>
            <div className="text-lg font-bold mt-1 mb-3">
              N° {venta.nroFactura || `0001-${venta.id.toString().padStart(8, '0')}`}
            </div>
            <p className="text-sm font-bold mb-3">Fecha de Emisión: {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(venta.createdAt))}</p>
          </div>
          <div>
            <p className="text-xs mb-1"><strong>CUIT:</strong> {empresaDatos.cuit}</p>
            <p className="text-xs mb-1"><strong>Ingresos Brutos:</strong> {empresaDatos.cuit}</p>
            <p className="text-xs"><strong>Inicio de Actividades:</strong> -</p>
          </div>
        </div>
      </div>

      {/* DATOS DEL CLIENTE */}
      <div className="border-2 border-black rounded mb-2 p-3 flex justify-between text-xs">
        <div className="flex flex-col gap-1 w-1/2">
          <p><strong>CUIT / DNI:</strong> {venta.cliente?.numeroDoc || 'Consumidor Final'}</p>
          <p><strong>Condición frente al IVA:</strong> {venta.cliente?.condicionIva || 'Consumidor Final'}</p>
          <p><strong>Condición de venta:</strong> {venta.medioPago === 'EFECTIVO' ? 'Efectivo' : 'Otra'}</p>
        </div>
        <div className="flex flex-col gap-1 w-1/2 pl-4">
          {venta.cliente ? (
            <>
              <p><strong>Señor/es:</strong> {venta.cliente.razonSocial || venta.cliente.nombre}</p>
              <p><strong>Domicilio:</strong> {venta.cliente.direccion || '-'}</p>
            </>
          ) : (
            <p className="text-lg font-bold">CONSUMIDOR FINAL</p>
          )}
        </div>
      </div>

      {/* GRILLA DE ITEMS */}
      <div className="border-2 border-black rounded flex-1 min-h-[150mm] relative flex flex-col">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 border-b-2 border-black text-xs">
              <th className="py-2 px-2 text-left font-bold border-r border-black w-24">Código</th>
              <th className="py-2 px-2 text-left font-bold border-r border-black">Producto / Servicio</th>
              <th className="py-2 px-2 text-center font-bold w-20 border-r border-black">Cantidad</th>
              <th className="py-2 px-2 text-right font-bold border-r border-black w-24">Precio Unit.</th>
              <th className="py-2 px-2 text-right font-bold border-r border-black w-16">% Bonif.</th>
              <th className="py-2 px-2 text-right font-bold w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {venta.items.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="py-1.5 px-2 font-mono text-[11px] border-r border-black">{item.producto?.codigoBarras || '-'}</td>
                <td className="py-1.5 px-2 text-[11px] font-medium border-r border-black uppercase">{item.producto?.nombre}</td>
                <td className="py-1.5 px-2 text-center text-[11px] border-r border-black">{item.cantidad}</td>
                <td className="py-1.5 px-2 text-right text-[11px] border-r border-black">{Number(item.precioUnitario).toFixed(2)}</td>
                <td className="py-1.5 px-2 text-right text-[11px] border-r border-black">0.00</td>
                <td className="py-1.5 px-2 text-right text-[11px]">{Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER TOTALES */}
      <div className="mt-2 border-2 border-black rounded p-3 flex justify-end">
        <div className="flex justify-between w-64 items-center">
          <span className="font-bold text-sm uppercase">Importe Total:</span>
          <span className="font-extrabold text-xl pr-2">${Number(venta.total).toFixed(2)}</span>
        </div>
      </div>

      {/* FOOTER FISCAL ARCA */}
      {venta.cae && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <QRCodeSVG value={qrUrl} size={120} />
            <img src="https://www.afip.gob.ar/images/afip/logo-afip.png" alt="ARCA" className="h-12 object-contain hidden" /> {/* Opcional logo ARCA */}
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="font-black text-lg mb-1">Comprobante Autorizado</p>
            <p className="font-bold">CAE: <span className="font-mono font-normal">{venta.cae}</span></p>
            <p className="font-bold mt-1">Vto. CAE: <span className="font-mono font-normal">{venta.vtoCae ? new Date(venta.vtoCae).toLocaleDateString() : ''}</span></p>
          </div>
        </div>
      )}
    </div>
  );
};
