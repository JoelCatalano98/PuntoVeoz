import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { generarQrUrl } from '../utils/arcaQr.util';
import toast from 'react-hot-toast';

interface TicketVentaProps {
  venta: any;
  onReadyToPrint?: () => void;
}

export const TicketVenta: React.FC<TicketVentaProps> = ({ venta, onReadyToPrint }) => {
  const [empresaDatos, setEmpresaDatos] = useState<any>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [anchoTicket, setAnchoTicket] = useState('80mm');
  const [margenTicket, setMargenTicket] = useState('2');

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const [resRS, resCuit, resDir, resIva, resAncho, resMargen] = await Promise.all([
          api.get('/parametros/empresaRazonSocial'),
          api.get('/parametros/empresaCuit'),
          api.get('/parametros/empresaDireccion'),
          api.get('/parametros/empresaCondicionIva'),
          api.get('/parametros/impresoraTicketAncho'),
          api.get('/parametros/impresoraTicketMargen')
        ]);
        if (!resRS.data?.valor || !resCuit.data?.valor) {
          throw new Error('Faltan datos fiscales del comercio (Razón Social o CUIT)');
        }
        setEmpresaDatos({
          razonSocial: resRS.data.valor,
          cuit: resCuit.data.valor,
          direccion: resDir.data?.valor || '',
          condicionIva: resIva.data?.valor || ''
        });
        if (resAncho.data?.valor) setAnchoTicket(resAncho.data.valor);
        if (resMargen.data?.valor) setMargenTicket(resMargen.data.valor);
      } catch (err: any) {
        console.error('Error al cargar datos empresa', err);
        setErrorCarga(err.message || 'Error al cargar los datos del comercio');
      }
    };
    fetchEmpresa();
  }, []);

  const qrUrl = generarQrUrl(venta, empresaDatos?.cuit || '');

  const yaImprimioRef = useRef(false);

  useEffect(() => {
    console.log('🖨️ TicketVenta useEffect evalúa:', { empresaDatos: !!empresaDatos, qrUrl: !!qrUrl, errorCarga, ventaCae: venta.cae });
    
    if (errorCarga) {
      toast.error(`Error de impresión: ${errorCarga}`);
      return;
    }
    
    if (venta.cae && !qrUrl) {
      toast.error('Error de impresión: No se pudo generar el QR fiscal (Falta Punto de Venta).');
      return;
    }

    if (empresaDatos && !yaImprimioRef.current) {
      console.log('🖨️ TicketVenta listo, llamando a onReadyToPrint()');
      yaImprimioRef.current = true;
      if (onReadyToPrint) onReadyToPrint();
    }
  }, [empresaDatos, qrUrl, errorCarga, venta.cae, onReadyToPrint]);

  if (!empresaDatos) {
    return null;
  }

  let tipoReal = venta.tipoComprobante;
  if (!tipoReal) {
    if (venta.cae) tipoReal = "FACTURA_C";
    else if (venta.estado === 'PRESUPUESTO') tipoReal = "PRESUPUESTO";
    else if (venta.estado === 'REMITO_PENDIENTE' || venta.estado === 'REMITO') tipoReal = "REMITO";
    else if (venta.estado === 'ANULADA') tipoReal = "NOTA_CREDITO";
    else tipoReal = "TICKET_NO_FISCAL";
  }

  let tituloDoc = "COMPROBANTE X";
  let subtitulo = "Documento no válido como factura";
  
  if (tipoReal?.startsWith('FACTURA')) {
    tituloDoc = tipoReal.replace('_', ' ');
    subtitulo = "Cod. 011";
  } else if (tipoReal?.startsWith('NOTA_CREDITO')) {
    tituloDoc = tipoReal.replace(/_/g, ' ');
    subtitulo = tipoReal === 'NOTA_CREDITO_A' ? "Cod. 003" : (tipoReal === 'NOTA_CREDITO_B' ? "Cod. 008" : "Cod. 013");
  } else if (tipoReal === 'PRESUPUESTO') {
    tituloDoc = "PRESUPUESTO";
  } else if (tipoReal === 'REMITO') {
    tituloDoc = "REMITO";
  } else if (tipoReal === 'TICKET_NO_FISCAL') {
    tituloDoc = "TICKET NO FISCAL";
  }

  const isFiscal = !!venta.cae;
  
  return (
    <div className={`hidden print:block font-mono text-black mx-auto bg-white`} style={{ width: anchoTicket, padding: `${margenTicket}mm`, fontSize: '12px', lineHeight: '1.4' }}>
      <div className="text-center mb-2">
        <h2 className="font-bold text-lg mb-1">{tituloDoc}</h2>
        <p className="text-[10px] font-bold mb-2 uppercase">{subtitulo}</p>
        <h3 className="font-bold text-md mb-1">{empresaDatos.razonSocial}</h3>
        <p className="text-xs">{empresaDatos.direccion}</p>
        {isFiscal && <p className="text-xs">CUIT: {empresaDatos.cuit}</p>}
        {isFiscal && <p className="text-xs">IVA: {empresaDatos.condicionIva}</p>}
        <p className="text-xs mt-1">--------------------------------</p>
      </div>

      <div className="mb-2">
        <p><strong>Fecha:</strong> {new Date(venta.createdAt).toLocaleString()}</p>
        <p><strong>Ticket N°:</strong> {`${String(venta.puntoVenta?.numero || venta.puntoVenta?.numeroArca || venta.puntoVentaId || 1).padStart(4, '0')}-${String(venta.nroFactura || venta.id).padStart(8, '0')}`}</p>
        <p><strong>Cajero:</strong> {venta.usuario?.nombre || 'Sin asignar'}</p>
        {venta.cliente && (
          <p>
            <strong>Cliente:</strong> {venta.cliente.nombre || venta.cliente.razonSocial}
            {isFiscal && venta.cliente.numeroDoc ? ` (CUIT/DNI: ${venta.cliente.numeroDoc})` : ''}
          </p>
        )}
      </div>

      <p className="text-xs">--------------------------------</p>
      <div className="mb-2">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-normal pb-1">CANT DESCRIPCION</th>
              <th className="text-right font-normal pb-1">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(venta.items || []).map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="py-[2px]">
                  {item.cantidad} x {(item.descripcion || item.producto?.nombre)?.substring(0, 20)}
                </td>
                <td className="text-right py-[2px]">${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs">--------------------------------</p>

      <div className="mb-4 text-right">
        <p className="font-bold text-base mt-1">TOTAL: ${Number(venta.total).toFixed(2)}</p>
        <p className="text-xs mt-1">Medio: {venta.medioPago || 'Efectivo'}</p>
      </div>

      {venta.cae && (
        <div className="mb-4 text-center border-t border-dashed border-black pt-2">
          <p className="text-xs font-bold mb-1">Comprobante Autorizado AFIP</p>
          <div className="flex justify-center my-2">
            <QRCodeSVG value={qrUrl} size={100} level="M" />
          </div>
          <p className="text-[10px]"><strong>CAE:</strong> {venta.cae}</p>
          <p className="text-[10px]"><strong>Vto. CAE:</strong> {venta.vencimientoCae ? new Date(venta.vencimientoCae).toLocaleDateString() : '-'}</p>
        </div>
      )}

      <div className="text-center mt-6 text-xs mb-8">
        <p>{(venta.tipoComprobante?.startsWith('NOTA_CREDITO') || venta.tipoComprobante?.startsWith('NC_')) ? 'Comprobante de anulación' : '¡Gracias por su compra!'}</p>
      </div>
    </div>
  );
};
