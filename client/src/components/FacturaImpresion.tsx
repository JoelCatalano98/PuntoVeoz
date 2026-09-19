import React from 'react';

// Tipamos las props para que reciba los datos de la compra
interface FacturaImpresionProps {
  tipo?: 'FACTURA' | 'ORDEN_RECEPCION';
  compra: {
    numeroFactura: string | null;
    fechaEmision: string;
    proveedor: {
      razonSocial: string;
      cuit: string | null;
      direccion?: string;
      condicionIva?: string | null;
    };
    metodoPago: string;
    detalles: Array<{
      producto: { nombre: string; codigoBarras?: string | null; id?: number };
      cantidad: number;
      precioCosto: number;
      subtotal: number;
    }>;
    total: number;
  };
}

export const FacturaImpresion: React.FC<FacturaImpresionProps> = ({ compra, tipo = 'FACTURA' }) => {
  const esOrden = tipo === 'ORDEN_RECEPCION';
  return (
    // Oculto en pantalla normal, visible solo al imprimir (tamaño A4)
    <div className="hidden print:block print:w-[210mm] print:h-[297mm] bg-white text-black font-sans text-sm p-8 absolute top-0 left-0 z-50">
      
      {/* CUADRO PRINCIPAL CON BORDE */}
      <div className="border-2 border-black h-full flex flex-col relative">
        
        {/* LETRA CENTRAL */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 border-x-2 border-b-2 border-black bg-white flex flex-col items-center justify-center w-14 h-14">
          <span className="text-3xl font-bold leading-none">{esOrden ? 'R' : 'X'}</span>
          <span className="text-[8px] font-bold mt-1">CÓD. 000</span>
        </div>

        {/* CABECERA (Mitad Izquierda y Derecha) */}
        <div className="flex border-b-2 border-black">
          {/* Izquierda: Datos del Emisor (Proveedor) */}
          <div className="w-1/2 p-4 text-center">
            <h2 className="text-2xl font-bold uppercase mb-2">{compra.proveedor.razonSocial}</h2>
            <p className="text-xs">
              {compra.proveedor.direccion || 'Dirección no especificada'} <br />
              {compra.proveedor.condicionIva ? `IVA ${compra.proveedor.condicionIva}` : 'Condición IVA no especificada'}
            </p>
          </div>
          
          {/* Derecha: Datos de la Factura */}
          <div className="w-1/2 p-4 pl-12">
            <h2 className="text-2xl font-bold mb-2">{esOrden ? 'ORDEN DE RECEPCIÓN' : 'FACTURA'}</h2>
            <p className="text-xs space-y-1">
              <strong>Nº:</strong> {compra.numeroFactura || '0000-00000000'} <br />
              <strong>Fecha de Emisión:</strong> {new Date(compra.fechaEmision).toLocaleDateString()} <br />
              <strong>CUIT:</strong> {compra.proveedor.cuit || '00-00000000-0'}
            </p>
          </div>
        </div>

        {/* DATOS DEL RECEPTOR (Tu Comercio) */}
        <div className="border-b-2 border-black p-2 text-xs grid grid-cols-2 gap-4">
          <div>
            <p><strong>Nombre:</strong> Consumidor Interno (Control de Stock)</p>
            <p><strong>Condición de Venta:</strong> {compra.metodoPago.replace('_', ' ')}</p>
          </div>
          <div>
            <p><strong>Domicilio:</strong> Local Principal</p>
          </div>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="flex-1 p-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="py-1 px-2 w-16">Código</th>
                <th className="py-1 px-2">Descripción</th>
                <th className="py-1 px-2 text-right">Cantidad</th>
                {!esOrden && <th className="py-1 px-2 text-right">P. Unitario</th>}
                {!esOrden && <th className="py-1 px-2 text-right">Importe</th>}
              </tr>
            </thead>
            <tbody>
              {compra.detalles.map((detalle, idx) => (
                <tr key={idx} className="border-b border-dashed border-gray-300">
                  <td className="py-1 px-2">{detalle.producto.codigoBarras || detalle.producto.id || '-'}</td>
                  <td className="py-1 px-2 uppercase font-semibold">{detalle.producto.nombre}</td>
                  <td className="py-1 px-2 text-right font-bold text-base">{Number(detalle.cantidad).toFixed(2)}</td>
                  {!esOrden && <td className="py-1 px-2 text-right">${Number(detalle.precioCosto).toFixed(2)}</td>}
                  {!esOrden && <td className="py-1 px-2 text-right font-bold">${Number(detalle.subtotal).toFixed(2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALES O FIRMAS */}
        {!esOrden ? (
          <div className="border-t-2 border-black p-4 flex justify-end">
            <div className="w-1/3 text-right text-sm">
              <div className="flex justify-between mb-1">
                <span>Subtotal: $</span>
                <span>{Number(compra.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2 border-t border-black pt-2">
                <span>Total: $</span>
                <span>{Number(compra.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t-2 border-black p-4 mt-auto">
            <div className="flex justify-between mt-12 mb-4 px-12">
              <div className="text-center">
                <div className="border-b border-black w-48 mb-2"></div>
                <p className="font-bold text-xs">Entregado Por</p>
                <p className="text-xs text-gray-500">(Firma y Aclaración)</p>
              </div>
              <div className="text-center">
                <div className="border-b border-black w-48 mb-2"></div>
                <p className="font-bold text-xs">Recibido Por (Local)</p>
                <p className="text-xs text-gray-500">(Firma y Aclaración)</p>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};
