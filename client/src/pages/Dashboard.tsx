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
    return <div className="h-full flex items-center justify-center text-gray-500">Cargando métricas...</div>;
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
    <div className="h-full flex flex-col bg-gray-50 p-6 overflow-y-auto">
      
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-brand-light" size={28} /> Panel de Control
          </h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de ventas y analíticas de negocio</p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => aplicarRangoRapido('hoy')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${rangoActivo === 'hoy' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Hoy
            </button>
            <button 
              onClick={() => aplicarRangoRapido('semana')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${rangoActivo === 'semana' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Esta Sem
            </button>
            <button 
              onClick={() => aplicarRangoRapido('mes')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${rangoActivo === 'mes' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mes
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={e => { setFechaDesde(e.target.value); handleManualChange(); }}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-light text-gray-700"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={e => { setFechaHasta(e.target.value); handleManualChange(); }}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-light text-gray-700"
            />
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 relative overflow-hidden">
              <div className="bg-green-100 p-4 rounded-full text-green-600 z-10">
                <DollarSign size={32} />
              </div>
              <div className="z-10">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Facturado</p>
                <h3 className="text-3xl font-extrabold text-gray-800">${data.totalFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-green-50 opacity-50 z-0">
                <DollarSign size={120} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 relative overflow-hidden">
              <div className="bg-blue-100 p-4 rounded-full text-blue-600 z-10">
                <TrendingUp size={32} />
              </div>
              <div className="z-10">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ventas Realizadas</p>
                <h3 className="text-3xl font-extrabold text-gray-800">{data.cantidadVentas}</h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-blue-50 opacity-50 z-0">
                <TrendingUp size={120} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 relative overflow-hidden">
              <div className="bg-purple-100 p-4 rounded-full text-purple-600 z-10">
                <CreditCard size={32} />
              </div>
              <div className="z-10">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ticket Promedio</p>
                <h3 className="text-3xl font-extrabold text-gray-800">${data.ticketPromedio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-purple-50 opacity-50 z-0">
                <CreditCard size={120} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Medios de Pago */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CreditCard className="text-gray-400" size={20} /> Recaudación por Medio de Pago
              </h3>
              
              <div className="flex-1 flex flex-col gap-5">
                {arrPagos.length === 0 ? (
                  <div className="text-gray-400 text-center py-10">No hay datos para el rango seleccionado</div>
                ) : (
                  arrPagos.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-bold text-gray-700 capitalize">{item.metodo.toLowerCase()}</span>
                        <div className="text-right">
                          <span className="font-bold text-gray-800">${item.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                          <span className="text-xs text-gray-400 ml-2 font-medium">({item.pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-brand-light h-3 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${item.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Productos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="text-gray-400" size={20} /> Top Productos Vendidos
              </h3>
              
              <div className="overflow-x-auto flex-1">
                {data.topProductos.length === 0 ? (
                  <div className="text-gray-400 text-center py-10">No hay ventas registradas en el rango</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Pos.</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Producto</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase text-center">Cantidad</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Recaudado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topProductos.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-400">#{idx + 1}</td>
                          <td className="p-3 font-semibold text-gray-800">{prod.nombre}</td>
                          <td className="p-3 text-center font-bold text-blue-600">{prod.cantidad}</td>
                          <td className="p-3 text-right font-bold text-green-600">${prod.recaudado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
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
