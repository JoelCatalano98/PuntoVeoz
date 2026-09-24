import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface TicketVentaProps {
  venta: any;
}

export const TicketVenta: React.FC<TicketVentaProps> = ({ venta }) => {
  const [empresaDatos, setEmpresaDatos] = useState({ razonSocial: '', cuit: '', direccion: '', condicionIva: '' });

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

  return (
    <div className="hidden print:block font-mono text-black w-[80mm] mx-auto p-2 bg-white" style={{ fontSize: '12px', lineHeight: '1.4' }}>
      <div className="text-center mb-2">
        <h2 className="font-bold text-lg mb-1">COMPROBANTE X</h2>
        <p className="text-[10px] font-bold mb-2 uppercase">Documento no válido como factura</p>
        <h3 className="font-bold text-md mb-1">{empresaDatos.razonSocial}</h3>
        <p className="text-xs">{empresaDatos.direccion}</p>
        <p className="text-xs">CUIT: {empresaDatos.cuit}</p>
        <p className="text-xs">IVA: {empresaDatos.condicionIva}</p>
        <p className="text-xs mt-1">--------------------------------</p>
      </div>

      <div className="mb-2">
        <p><strong>Fecha:</strong> {new Date(venta.createdAt).toLocaleString()}</p>
        <p><strong>Ticket N°:</strong> {venta.nroFactura ? `${String(venta.puntoVenta?.numero || 1).padStart(4, '0')}-${String(venta.nroFactura).padStart(8, '0')}` : `0001-${venta.id.toString().padStart(8, '0')}`}</p>
        <p><strong>Cajero:</strong> {venta.usuario?.nombre || 'Cajero'}</p>
        {venta.cliente && (
          <p><strong>Cliente:</strong> {venta.cliente.nombre || venta.cliente.razonSocial} ({venta.cliente.numeroDoc})</p>
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
        <p className="text-xs mt-1">Medio: {venta.medioPago}</p>
      </div>

      <div className="text-center mt-6 text-xs mb-8">
        <p>¡Gracias por su compra!</p>
      </div>
    </div>
  );
};
