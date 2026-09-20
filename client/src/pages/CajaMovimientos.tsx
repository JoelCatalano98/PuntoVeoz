import { useState, useEffect } from 'react';
import { AlertCircle, Printer, History } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { imprimirTicket } from '../services/ticket.service';
import { Pagination } from '../components/Pagination';

const CajaMovimientos = () => {
  const [cargando, setCargando] = useState(true);
  const [aperturaCajaId, setAperturaCajaId] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  useEffect(() => {
    cargarEstadoYMovimientos(1);
  }, []);

  const cargarEstadoYMovimientos = async (pageToLoad = page) => {
    try {
      // 1. Obtener estado para saber el aperturaCajaId actual
      const resEstado = await api.get('/caja/estado');
      if (resEstado.data.abierta) {
        const id = resEstado.data.apertura.id;
        setAperturaCajaId(id);
        
        // 2. Obtener los movimientos
        const resMov = await api.get(`/caja/${id}/movimientos`, { params: { page: pageToLoad, limit } });
        setMovimientos(resMov.data.data);
        setTotalPages(resMov.data.totalPages);
        setTotalCount(resMov.data.totalCount);
        setPage(pageToLoad);
      } else {
        setAperturaCajaId(null);
      }
    } catch (err) {
      toast.error('Error al cargar los movimientos');
    } finally {
      setCargando(false);
    }
  };

  const handleReimprimir = async (ventaId: number) => {
    try {
      const res = await api.get(`/ventas/${ventaId}`);
      imprimirTicket(res.data);
    } catch (err) {
      toast.error('Error al obtener la venta para reimprimir');
    }
  };

  if (cargando) {
    return <div className="h-full flex items-center justify-center text-gray-500">Cargando movimientos...</div>;
  }

  if (!aperturaCajaId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6">
        <AlertCircle size={64} className="text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700">No hay caja abierta</h2>
        <p className="text-gray-500 mt-2">Debe abrir su turno de caja para ver los movimientos de la sesión actual.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="mb-6 flex items-center gap-3">
        <History className="text-brand-light" size={32} />
        <h1 className="text-3xl font-bold text-gray-800">Movimientos de Caja Actual</h1>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 border-b border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Hora</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Detalle</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Monto</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No hay movimientos registrados en este turno.</td>
                </tr>
              ) : (
                movimientos.map(mov => {
                  const isIngreso = mov.tipo === 'VENTA' || mov.tipo === 'INGRESO_MANUAL';
                  return (
                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(mov.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                          ${mov.tipo === 'VENTA' ? 'bg-blue-50 text-blue-600' : ''}
                          ${mov.tipo === 'INGRESO_MANUAL' ? 'bg-green-50 text-green-600' : ''}
                          ${mov.tipo === 'EGRESO_MANUAL' ? 'bg-orange-50 text-orange-600' : ''}
                        `}>
                          {mov.tipo.replace('_MANUAL', '')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 font-medium">
                        {mov.tipo === 'VENTA' ? `Venta en ${mov.medioPago}` : mov.descripcion}
                      </td>
                      <td className={`p-4 text-sm font-bold text-right ${isIngreso ? 'text-green-600' : 'text-red-500'}`}>
                        {isIngreso ? '+' : '-'}${Number(mov.monto).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        {mov.tipo === 'VENTA' && mov.ventaId && (
                          <button
                            onClick={() => handleReimprimir(mov.ventaId)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Reimprimir Ticket"
                          >
                            <Printer size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalCount={totalCount} 
          onPageChange={(newPage) => cargarEstadoYMovimientos(newPage)} 
        />
      </div>
    </div>
  );
};

export default CajaMovimientos;
