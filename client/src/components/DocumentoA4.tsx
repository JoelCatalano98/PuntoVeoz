import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface DocumentoA4Props {
  venta: any;
  tipo: 'REMITO' | 'PRESUPUESTO' | 'FACTURA' | 'NOTA_CREDITO' | 'TICKET_NO_FISCAL';
}

export const DocumentoA4: React.FC<DocumentoA4Props> = ({ venta, tipo }) => {
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
          razonSocial: resRS.data?.valor || 'Empresa / Comercio',
          cuit: resCuit.data?.valor || '',
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
          <div className="text-3xl font-extrabold leading-none mt-2">
            {tipo === 'REMITO' ? 'R' : 'X'}
          </div>
          <div className="text-[8px] font-bold mt-1 text-center">
            CÓD. 000
          </div>
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
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">{empresaDatos.razonSocial || 'EMPRESA GENÉRICA'}</h2>
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
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {tipo === 'REMITO' ? 'REMITO' : tipo === 'PRESUPUESTO' ? 'PRESUPUESTO' : 'COMPROBANTE NO FISCAL'}
            </h1>
            <div className="text-lg font-bold mt-1 mb-3">
              N° 0001-{venta.id.toString().padStart(8, '0')}
            </div>
            <p className="text-sm font-bold mb-3">Fecha de Emisión: {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(venta.createdAt))}</p>
          </div>
          <div>
            <p className="text-xs mb-1"><strong>CUIT:</strong> {empresaDatos.cuit || '00-00000000-0'}</p>
            <p className="text-xs mb-1"><strong>Ingresos Brutos:</strong> {empresaDatos.cuit || '00-00000000-0'}</p>
            <p className="text-xs"><strong>Fecha de Inicio de Actividades:</strong> -</p>
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
              <th className={`py-2 px-2 text-center font-bold w-20 ${(tipo === 'PRESUPUESTO' || tipo === 'FACTURA') ? 'border-r border-black' : ''}`}>Cantidad</th>
              {(tipo === 'PRESUPUESTO' || tipo === 'FACTURA') && (
                <>
                  <th className="py-2 px-2 text-right font-bold border-r border-black w-24">Precio Unit.</th>
                  <th className="py-2 px-2 text-right font-bold border-r border-black w-16">% Bonif.</th>
                  <th className="py-2 px-2 text-right font-bold w-28">Subtotal</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="align-top">
            {venta.items?.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="py-1.5 px-2 font-mono text-[11px] border-r border-black">{item.producto?.codigoBarras || '-'}</td>
                <td className="py-1.5 px-2 text-[11px] font-medium border-r border-black uppercase">{item.descripcion || item.producto?.nombre}</td>
                <td className={`py-1.5 px-2 text-center text-[11px] ${(tipo === 'PRESUPUESTO' || tipo === 'FACTURA') ? 'border-r border-black' : ''}`}>{item.cantidad}</td>
                {(tipo === 'PRESUPUESTO' || tipo === 'FACTURA') && (
                  <>
                    <td className="py-1.5 px-2 text-right text-[11px] border-r border-black">{Number(item.precioUnitario).toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right text-[11px] border-r border-black">0.00</td>
                    <td className="py-1.5 px-2 text-right text-[11px]">{Number(item.subtotal).toFixed(2)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER TOTALES */}
      {(tipo === 'PRESUPUESTO' || tipo === 'FACTURA') && (
        <div className="mt-2 border-2 border-black rounded p-3 flex justify-end">
          <div className="flex justify-between w-64 items-center">
            <span className="font-bold text-sm uppercase">Importe Total:</span>
            <span className="font-extrabold text-xl pr-2">${Number(venta.total).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ESPACIO FIRMA PARA REMITO */}
      {tipo === 'REMITO' && (
        <div className="mt-8 border-2 border-black rounded p-4 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold uppercase mb-8">Firma de Conformidad (Cliente)</p>
            <div className="border-b border-black w-full mb-1"></div>
            <div className="flex justify-between text-[10px]">
              <span>Firma y Aclaración</span>
              <span>DNI / CUIT</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase mb-8">Entregado Por (Local)</p>
            <div className="border-b border-black w-full mb-1"></div>
            <div className="flex justify-between text-[10px]">
              <span>Firma y Aclaración</span>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 left-0 right-0 text-center font-bold text-[10px]">
        DOCUMENTO NO VÁLIDO COMO FACTURA - Generado por PuntoVeloz
      </div>
    </div>
  );
};
