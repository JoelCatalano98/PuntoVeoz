import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, CreditCard, DollarSign, Calendar, Package } from 'lucide-react';

interface TopProducto {
  id: number;
  nombre: string;
  cantidad: number;
  recaudado: number;
}

interface ResumenData {
  totalFacturado: number;
  cantidadVentas: number;
  ticketPromedio: number;
  ventasPorMetodo: Record<string, number>;
  topProductos: TopProducto[];
  desde: string;
  hasta: string;
}

const Dashboard = () => {
  const [data, setData] = useState<ResumenData | null>(null);
  const [cargando, setCargando] = useState(true);

  // Filtros de fecha local
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [fechaDesde, setFechaDesde] = useState(getTodayStr());
  const [fechaHasta, setFechaHasta] = useState(getTodayStr());
  const [rangoActivo, setRangoActivo] = useState<'hoy' | 'semana' | 'mes' | 'manual'>('hoy');

  useEffect(() => {
    cargarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta]);

  const cargarDashboard = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      
      const res = await api.get('/dashboard/resumen', { params });
      setData(res.data);
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setCargando(false);
    }
  };

  const aplicarRangoRapido = (tipo: 'hoy' | 'semana' | 'mes') => {
    setRangoActivo(tipo);
    const hoy = new Date();
    let desde = new Date();
    let hasta = new Date();

    if (tipo === 'hoy') {
      // ya están igual
    } else if (tipo === 'semana') {
      const dia = hoy.getDay();
      const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1); // Lunes
      desde = new Date(hoy.setDate(diff));
    } else if (tipo === 'mes') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }

    setFechaDesde(desde.toISOString().split('T')[0]);
    setFechaHasta(hasta.toISOString().split('T')[0]);
  };

  const handleManualChange = () => {
    setRangoActivo('manual');
  };

  if (cargando && !data) {
    return <div className="h-full flex items-center justify-center text-gray-500 dark:text-slate-400 transition-colors duration-200">Cargando métricas...</div>;
  }

  // Pre-procesar datos de métodos de pago
  let maxPago = 0;
  const arrPagos: { metodo: string, monto: number, pct: number }[] = [];
  if (data) {
    Object.keys(data.ventasPorMetodo).forEach(key => {
      const v = data.ventasPorMetodo[key];
      if (v > maxPago) maxPago = v;
    });

    Object.keys(data.ventasPorMetodo).forEach(key => {
      const v = data.ventasPorMetodo[key];
      arrPagos.push({
        metodo: key.replace('_', ' '),
        monto: v,
        pct: data.totalFacturado > 0 ? (v / data.totalFacturado) * 100 : 0
      });
    });
    // Ordenar de mayor a menor
    arrPagos.sort((a, b) => b.monto - a.monto);
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 overflow-y-auto transition-colors duration-200">
      
      <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="text-brand-light" size={28} /> Panel de Control
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Resumen de ventas y analíticas de negocio</p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1 rounded-lg">
            <button 
              onClick={() => aplicarRangoRapido('hoy')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${rangoActivo === 'hoy' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-dark dark:text-brand-light' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Hoy
            </button>
            <button 
              onClick={() => aplicarRangoRapido('semana')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${rangoActivo === 'semana' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-dark dark:text-brand-light' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Esta Sem
            </button>
            <button 
              onClick={() => aplicarRangoRapido('mes')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${rangoActivo === 'mes' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-dark dark:text-brand-light' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Mes
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400 dark:text-slate-500" />
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={e => { setFechaDesde(e.target.value); handleManualChange(); }}
              className="border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-light text-gray-700 dark:text-slate-200"
            />
            <span className="text-gray-400 dark:text-slate-500">-</span>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={e => { setFechaHasta(e.target.value); handleManualChange(); }}
              className="border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-light text-gray-700 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center gap-4 relative overflow-hidden transition-colors duration-200">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full text-green-600 dark:text-green-400 z-10">
                <DollarSign size={32} />
              </div>
              <div className="z-10">
                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Facturado</p>
                <h3 className="text-3xl font-extrabold text-gray-800 dark:text-slate-100">${data.totalFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-green-50 dark:text-green-900/10 opacity-50 z-0">
                <DollarSign size={120} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center gap-4 relative overflow-hidden transition-colors duration-200">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 z-10">
                <TrendingUp size={32} />
              </div>
              <div className="z-10">
                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ventas Realizadas</p>
                <h3 className="text-3xl font-extrabold text-gray-800 dark:text-slate-100">{data.cantidadVentas}</h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-blue-50 dark:text-blue-900/10 opacity-50 z-0">
                <TrendingUp size={120} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center gap-4 relative overflow-hidden transition-colors duration-200">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full text-purple-600 dark:text-purple-400 z-10">
                <CreditCard size={32} />
              </div>
              <div className="z-10">
                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ticket Promedio</p>
                <h3 className="text-3xl font-extrabold text-gray-800 dark:text-slate-100">${data.ticketPromedio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-purple-50 dark:text-purple-900/10 opacity-50 z-0">
                <CreditCard size={120} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Medios de Pago */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col transition-colors duration-200">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <CreditCard className="text-gray-400 dark:text-slate-500" size={20} /> Recaudación por Medio de Pago
              </h3>
              
              <div className="flex-1 flex flex-col gap-5">
                {arrPagos.length === 0 ? (
                  <div className="text-gray-400 dark:text-slate-500 text-center py-10">No hay datos para el rango seleccionado</div>
                ) : (
                  arrPagos.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-bold text-gray-700 dark:text-slate-300 capitalize">{item.metodo.toLowerCase()}</span>
                        <div className="text-right">
                          <span className="font-bold text-gray-800 dark:text-slate-100">${item.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500 ml-2 font-medium">({item.pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-brand-light dark:bg-blue-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${item.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Productos */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col transition-colors duration-200">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <Package className="text-gray-400 dark:text-slate-500" size={20} /> Top Productos Vendidos
              </h3>
              
              <div className="overflow-x-auto flex-1">
                {data.topProductos.length === 0 ? (
                  <div className="text-gray-400 dark:text-slate-500 text-center py-10">No hay ventas registradas en el rango</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Pos.</th>
                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Producto</th>
                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Cantidad</th>
                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Recaudado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {data.topProductos.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
                          <td className="p-3 font-bold text-gray-400 dark:text-slate-500">#{idx + 1}</td>
                          <td className="p-3 font-semibold text-gray-800 dark:text-slate-200">{prod.nombre}</td>
                          <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{prod.cantidad}</td>
                          <td className="p-3 text-right font-bold text-green-600 dark:text-green-400">${prod.recaudado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
