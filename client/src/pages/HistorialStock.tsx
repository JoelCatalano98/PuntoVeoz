import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { History, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Movimiento {
  id: number;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string;
  observaciones: string | null;
  createdAt: string;
  producto: {
    nombre: string;
    codigoBarras: string;
  };
  usuario: {
    nombre: string;
    username: string;
  };
}

const HistorialStock = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros (solo cliente por ahora para hacerlo rápido, pero backend soporta)
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setCargando(true);
      const res = await api.get('/stock/movimientos');
      setMovimientos(res.data);
    } catch (err) {
      toast.error('Error al cargar el historial de stock');
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const movimientosFiltrados = movimientos.filter(m => 
    m.producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.producto.codigoBarras && m.producto.codigoBarras.includes(busqueda)) ||
    m.motivo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/ajuste-stock" className="text-gray-400 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold text-brand-dark dark:text-slate-200 flex items-center gap-2">
              <History className="text-brand-light" size={26} /> Historial de Movimientos
            </h1>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm ml-9">Registro inmutable de entradas y salidas de inventario</p>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar producto o motivo..."
            className="w-full pl-9 pr-3 py-2 border dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-1 focus:ring-brand-light outline-none text-sm shadow-sm transition-colors"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-200">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 transition-colors">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-40">Fecha</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Producto</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-28">Cant.</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-48">Motivo</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-36">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {cargando ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 dark:text-slate-500">Cargando historial...</td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 dark:text-slate-500">
                    No se encontraron movimientos registrados
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map(mov => (
                  <tr key={mov.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                      {formatearFecha(mov.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{mov.producto.nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 font-mono">{mov.producto.codigoBarras || '-'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full border ${mov.tipo === 'ENTRADA' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'}`}>
                        {mov.tipo}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-mono font-bold text-sm ${mov.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-700 dark:text-slate-300">{mov.motivo}</div>
                      {mov.observaciones && (
                        <div className="text-xs text-gray-500 dark:text-slate-400 italic mt-0.5 max-w-[200px] truncate" title={mov.observaciones}>
                          {mov.observaciones}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700 dark:text-slate-300">{mov.usuario.nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500">@{mov.usuario.username}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400 flex justify-between transition-colors">
          <span>Mostrando {movimientosFiltrados.length} movimientos</span>
          <span>(Solo se listan los últimos 200 registros)</span>
        </div>
      </div>
    </div>
  );
};

export default HistorialStock;
