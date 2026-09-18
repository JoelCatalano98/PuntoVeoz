import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ShoppingCart, Search, FileText, Printer } from 'lucide-react';
import { FacturaImpresion } from '../components/FacturaImpresion';

interface DetalleCompra {
  producto: { nombre: string; codigoBarras: string | null };
  cantidad: number;
  precioCosto: number;
  subtotal: number;
}

interface Compra {
  id: number;
  numeroFactura: string | null;
  fechaEmision: string;
  total: number;
  metodoPago: string;
  proveedor: { razonSocial: string; cuit: string | null };
  usuario: { nombre: string; username: string };
  detalles: DetalleCompra[];
  createdAt: string;
}

const ComprasHistorial = () => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [compraSeleccionada, setCompraSeleccionada] = useState<Compra | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setCargando(true);
      const res = await api.get('/compras');
      setCompras(res.data);
    } catch (err) {
      toast.error('Error al cargar el historial de compras');
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(d);
  };

  const comprasFiltradas = compras.filter(c => 
    c.proveedor.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.numeroFactura && c.numeroFactura.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6 print:p-0 print:bg-white">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <ShoppingCart className="text-brand-light" size={26} /> Historial de Compras
          </h1>
          <p className="text-gray-500 text-sm mt-1">Consulta de facturas y recepciones de mercadería previas</p>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar proveedor o factura..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-1 focus:ring-brand-light outline-none text-sm shadow-sm"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 print:gap-0">
        {/* PANEL IZQUIERDO: Lista de Compras */}
        <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
          <div className="overflow-y-auto flex-1 p-2">
            {cargando ? (
              <div className="p-8 text-center text-gray-400 font-bold">Cargando historial...</div>
            ) : comprasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-bold">No se encontraron compras registradas</div>
            ) : (
              comprasFiltradas.map(compra => (
                <div 
                  key={compra.id} 
                  onClick={() => setCompraSeleccionada(compra)}
                  className={`p-4 mb-2 border rounded-lg cursor-pointer transition-colors flex justify-between items-center ${compraSeleccionada?.id === compra.id ? 'bg-blue-50 border-brand-light' : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <div>
                    <div className="font-bold text-gray-800 text-lg mb-1">{compra.proveedor.razonSocial}</div>
                    <div className="text-xs text-gray-500 flex gap-3">
                      <span><span className="font-bold">Emisión:</span> {formatearFecha(compra.fechaEmision)}</span>
                      <span><span className="font-bold">Factura:</span> {compra.numeroFactura || 'S/N'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-brand-dark">${Number(compra.total).toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1 uppercase font-bold">{compra.metodoPago.replace('_', ' ')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Detalle de la Compra */}
        <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:w-full print:border-none print:shadow-none">
          {compraSeleccionada ? (
            <div className="flex flex-col h-full print:h-auto">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start print:bg-white print:border-b-2 print:border-black">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 text-2xl mb-2">
                    <FileText size={20} className="text-gray-400 print:hidden" /> Detalle de Factura
                  </h2>
                  <div className="text-sm text-gray-500 mt-2">
                    Proveedor: <span className="font-bold text-gray-700">{compraSeleccionada.proveedor.razonSocial}</span> (CUIT: {compraSeleccionada.proveedor.cuit || 'S/D'})
                  </div>
                  <div className="text-sm text-gray-500">
                    Registrado por: <span className="font-bold text-gray-700">{compraSeleccionada.usuario.nombre}</span> el {formatearFecha(compraSeleccionada.createdAt)}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-wider print:hidden">Total General</div>
                  <div className="text-2xl font-bold font-mono text-brand-dark mb-3">${Number(compraSeleccionada.total).toFixed(2)}</div>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-brand-dark text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors print:hidden"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto print:overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Cant.</th>
                      <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Costo</th>
                      <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compraSeleccionada.detalles.map((det, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-bold text-sm text-gray-800">{det.producto.nombre}</div>
                          <div className="text-xs text-gray-400 font-mono">{det.producto.codigoBarras || 'S/N'}</div>
                        </td>
                        <td className="p-3 text-center font-bold text-sm text-gray-700">{det.cantidad}</td>
                        <td className="p-3 text-right font-mono text-sm text-gray-600">${Number(det.precioCosto).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-gray-700">${Number(det.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <FileText size={48} className="mb-4 text-gray-300" />
              <p className="text-lg font-bold">Seleccioná una factura</p>
              <p className="text-sm text-center mt-2">Hacé clic en una compra de la lista para ver todos los productos ingresados en ese comprobante.</p>
            </div>
          )}
        </div>
      </div>

      {/* COMPONENTE DE IMPRESIÓN (Solo visible al imprimir) */}
      {compraSeleccionada && (
        <FacturaImpresion compra={compraSeleccionada as any} />
      )}
    </div>
  );
};

export default ComprasHistorial;
