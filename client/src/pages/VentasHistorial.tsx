import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RefreshCcw, XCircle, Search, AlertCircle } from 'lucide-react';

interface Venta {
  id: number;
  total: number;
  anulada: boolean;
  createdAt: string;
  medioPago: string;
  cliente?: { nombre: string } | null;
  usuario?: { nombre: string } | null;
  items: any[];
}

const VentasHistorial = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');

  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);
  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false);
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setCargando(true);
      const res = await api.get('/ventas/historial');
      setVentas(res.data);
    } catch (error) {
      toast.error('Error al cargar historial de ventas');
    } finally {
      setCargando(false);
    }
  };

  const handleAnular = async () => {
    if (!ventaAAnular) return;
    setAnulando(true);
    try {
      await api.post(`/ventas/${ventaAAnular.id}/anular`);
      toast.success('Venta anulada correctamente (Stock y Caja actualizados)');
      cargarVentas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al anular la venta');
    } finally {
      setAnulando(false);
      setVentaAAnular(null);
      setConfirmarAnulacion(false);
    }
  };

  const ventasFiltradas = ventas.filter(v => {
    if (!filtroTexto) return true;
    const txt = filtroTexto.toLowerCase();
    return (
      v.id.toString().includes(txt) ||
      (v.cliente?.nombre || 'Consumidor Final').toLowerCase().includes(txt)
    );
  });

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Historial de Ventas</h1>
          <p className="text-gray-500 text-sm mt-1">Últimas 100 ventas registradas</p>
        </div>
        <button
          onClick={cargarVentas}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCcw size={18} /> Actualizar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por ID o Cliente..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light"
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">ID Venta</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Medio Pago</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Cargando ventas...</td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">No se encontraron ventas</td>
                </tr>
              ) : (
                ventasFiltradas.map(venta => (
                  <tr key={venta.id} className={`hover:bg-gray-50 transition-colors ${venta.anulada ? 'bg-red-50/30' : ''}`}>
                    <td className="p-4 font-mono text-sm text-gray-600">#{venta.id}</td>
                    <td className="p-4 text-sm text-gray-800">
                      {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(venta.createdAt))}
                    </td>
                    <td className="p-4 text-sm text-gray-800 font-medium">
                      {venta.cliente?.nombre || 'Consumidor Final'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {venta.medioPago.replace('_', ' ')}
                    </td>
                    <td className="p-4 text-sm font-bold text-brand-dark text-right">
                      ${Number(venta.total).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      {venta.anulada ? (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                          ANULADA
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                          COMPLETADA
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {!venta.anulada && (
                        <button
                          onClick={() => setVentaAAnular(venta)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Anular Venta"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmar Anulación */}
      {ventaAAnular && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-500 p-6 flex flex-col items-center justify-center text-white">
              <AlertCircle size={48} className="mb-2" />
              <h2 className="text-xl font-bold">¿Anular Venta #{ventaAAnular.id}?</h2>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6">
                Esta acción devolverá <strong>{ventaAAnular.items.length} productos</strong> al stock e ingresará un egreso de caja por <strong>${Number(ventaAAnular.total).toFixed(2)}</strong>.
              </p>
              
              {!confirmarAnulacion ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setVentaAAnular(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setConfirmarAnulacion(true)}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                  >
                    Sí, Anular
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 flex-col">
                  <div className="bg-red-50 p-3 rounded text-red-800 text-sm font-semibold mb-2 border border-red-100 text-center">
                    ¿Estás absolutamente seguro? Esta acción no se puede deshacer.
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmarAnulacion(false)}
                      disabled={anulando}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleAnular}
                      disabled={anulando}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasHistorial;
