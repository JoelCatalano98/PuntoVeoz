import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Wallet, Printer, FileText, ChevronDown } from 'lucide-react';
import { Pagination } from '../components/Pagination';

interface CierreCaja {
  id: number;
  aperturaCajaId: number;
  totalEsperado: string;
  totalContado: string;
  diferencia: string;
  createdAt: string;
  usuario: {
    nombre: string;
  };
  aperturaCaja: {
    caja: {
      nombre: string;
      prefijo: string;
    };
  };
}

const CierresHistorial = () => {
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros por defecto al mes en curso
  const getPrimerDiaMes = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };
  const getHoyStr = () => new Date().toISOString().split('T')[0];

  const [fechaDesde, setFechaDesde] = useState(getPrimerDiaMes());
  const [fechaHasta, setFechaHasta] = useState(getHoyStr());

  // Estado para impresión
  const [ticketZData, setTicketZData] = useState<any>(null);
  const [resumenData, setResumenData] = useState<any>(null);

  // Menú de acciones por fila
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    cargarCierres(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta]);

  const cargarCierres = async (pageToLoad = page) => {
    try {
      setCargando(true);
      const res = await api.get('/caja/cierres', {
        params: { fechaDesde, fechaHasta, page: pageToLoad, limit: 15 }
      });
      setCierres(res.data.data || res.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
      setPage(pageToLoad);
    } catch (error) {
      toast.error('Error al cargar historial de arqueos');
    } finally {
      setCargando(false);
    }
  };

  const handleImprimir = async (cierre: CierreCaja, conResumen: boolean) => {
    setMenuAbierto(null);
    try {
      if (conResumen) {
        toast.loading('Cargando resumen de ventas...', { id: 'imprimiendo' });
        const res = await api.get(`/caja/cierres/${cierre.id}`);
        setResumenData(res.data.resumenVentas);
      } else {
        setResumenData(null);
      }

      setTicketZData({
        fecha: new Date(cierre.createdAt).toLocaleString('es-AR'),
        cajero: cierre.usuario.nombre,
        cajaNombre: cierre.aperturaCaja.caja.nombre,
        esperado: cierre.totalEsperado,
        contado: cierre.totalContado,
        diferencia: cierre.diferencia
      });

      if (conResumen) toast.dismiss('imprimiendo');

      // Dar tiempo a React para renderizar el DOM del ticket
      setTimeout(() => {
        window.print();
        setTicketZData(null); // limpiar después de imprimir
        setResumenData(null);
      }, 300);

    } catch (err) {
      toast.dismiss('imprimiendo');
      toast.error('Error al cargar datos para imprimir');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden print:bg-white print:overflow-visible transition-colors duration-200">
      
      {/* PANTALLA NORMAL (Oculta al imprimir) */}
      <div className="flex flex-col h-full p-6 overflow-hidden print:hidden">
        
        {/* Header y Filtros */}
        <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex-none transition-colors duration-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <Wallet className="text-brand-light" size={28} /> Historial de Arqueos (Cierres Z)
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Consulta e imprime los cierres pasados</p>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors duration-200">
            <Calendar size={18} className="text-gray-400 dark:text-slate-500" />
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
              className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 dark:text-slate-200 w-32 cursor-pointer dark:[color-scheme:dark]"
            />
            <span className="text-gray-400 dark:text-slate-500">-</span>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
              className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 dark:text-slate-200 w-32 cursor-pointer dark:[color-scheme:dark]"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-200">
          {cargando ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-400">Cargando arqueos...</div>
          ) : cierres.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500">No se encontraron cierres en este rango de fechas.</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0 border-b border-gray-200 dark:border-slate-700 z-10 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Fecha / Hora Cierre</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Caja</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Cajero</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Efectivo Esperado</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Contado</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Diferencia</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 pb-32">
                  {cierres.map(cierre => {
                    const difNum = Number(cierre.diferencia);
                    return (
                      <tr key={cierre.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 text-sm font-semibold text-gray-800 dark:text-slate-200">
                          {new Date(cierre.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 font-bold text-gray-600 dark:text-slate-300">
                          {cierre.aperturaCaja.caja.nombre} <span className="text-gray-400 dark:text-slate-500 font-normal">({cierre.aperturaCaja.caja.prefijo})</span>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-slate-400">{cierre.usuario.nombre}</td>
                        <td className="p-4 text-sm text-right text-gray-500 dark:text-slate-400 font-medium">
                          ${Number(cierre.totalEsperado).toFixed(2)}
                        </td>
                        <td className="p-4 text-sm text-right font-bold text-gray-800 dark:text-slate-200">
                          ${Number(cierre.totalContado).toFixed(2)}
                        </td>
                        <td className={`p-4 text-sm font-extrabold text-right ${difNum < 0 ? 'text-red-600 dark:text-red-400' : difNum > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                          {difNum > 0 ? '+' : ''}{difNum.toFixed(2)}
                        </td>
                        <td className="p-4 text-center relative">
                          <button 
                            onClick={() => setMenuAbierto(menuAbierto === cierre.id ? null : cierre.id)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-gray-500 dark:text-slate-400 transition-colors"
                          >
                            <ChevronDown size={18} />
                          </button>
                          
                          {menuAbierto === cierre.id && (
                            <div className="absolute right-4 top-12 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 z-50 py-1 flex flex-col text-left">
                              <button 
                                onClick={() => handleImprimir(cierre, false)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                              >
                                <Printer size={16} className="text-gray-400 dark:text-slate-500" /> Reimprimir Ticket Z
                              </button>
                              <button 
                                onClick={() => handleImprimir(cierre, true)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                              >
                                <FileText size={16} className="text-gray-400 dark:text-slate-500" /> Z + Resumen de Ventas
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={cargarCierres}
              />
            </>
          )}
        </div>
      </div>

      {/* COMPONENTE DE IMPRESIÓN (SOLO VISIBLE EN @media print) */}
      {ticketZData && (
        <div className="hidden print:block font-mono text-black w-[80mm] mx-auto p-4 bg-white" style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <div className="text-center mb-4">
            <h2 className="font-bold text-lg mb-1">CIERRE DE CAJA (Z)</h2>
            <p className="text-xs">{ticketZData.cajaNombre}</p>
          </div>
          
          <div className="mb-4 border-b border-black pb-2 border-dashed">
            <p><strong>Fecha:</strong> {ticketZData.fecha}</p>
            <p><strong>Cajero:</strong> {ticketZData.cajero}</p>
          </div>

          <div className="mb-4 space-y-1">
            <div className="flex justify-between">
              <span>Efectivo Esperado:</span>
              <span>${Number(ticketZData.esperado).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Efectivo Contado:</span>
              <span>${Number(ticketZData.contado).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold mt-2 pt-2 border-t border-black border-dashed">
              <span>DIFERENCIA:</span>
              <span>${Number(ticketZData.diferencia).toFixed(2)}</span>
            </div>
          </div>

          {resumenData && (
            <div className="mt-6 mb-4">
              <div className="text-center border-b border-black pb-1 mb-2 border-dashed">
                <h3 className="font-bold">RESUMEN DEL TURNO</h3>
              </div>
              <div className="space-y-1">
                {Object.keys(resumenData.totalesPorMedioPago).length === 0 ? (
                  <p className="text-center">No hubo ventas registradas.</p>
                ) : (
                  Object.entries(resumenData.totalesPorMedioPago).map(([metodo, monto]) => (
                    <div key={metodo} className="flex justify-between">
                      <span className="capitalize">{metodo.replace('_', ' ')}:</span>
                      <span>${Number(monto).toFixed(2)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between font-bold mt-2 pt-2 border-t border-black border-dashed">
                  <span>TOTAL FACTURADO:</span>
                  <span>${resumenData.totalFacturado.toFixed(2)}</span>
                </div>
                <div className="text-center mt-2 text-xs">
                  (Total ventas: {resumenData.cantidadVentas})
                </div>
              </div>
            </div>
          )}

          <div className="text-center mt-8 text-xs">
            <p>_______________________</p>
            <p className="mt-1">Firma Cajero</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default CierresHistorial;
