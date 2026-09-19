import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, AlertCircle, X, DollarSign } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Movimiento {
  id: number;
  tipo: string;
  monto: string;
  medioPago: string | null;
  descripcion: string | null;
  createdAt: string;
}

interface Apertura {
  id: number;
  montoInicial: string;
  caja: {
    nombre: string;
  };
  movimientos: Movimiento[];
}

interface CajaFisica {
  id: number;
  nombre: string;
  prefijo: string;
}

const Caja = () => {
  const { usuario, token } = useAuth();
  
  // Estado general
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState(false);
  
  // Datos cuando está abierta
  const [apertura, setApertura] = useState<Apertura | null>(null);
  const [totalEsperado, setTotalEsperado] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [egresos, setEgresos] = useState(0);

  // Datos cuando está cerrada
  const [cajasFisicas, setCajasFisicas] = useState<CajaFisica[]>([]);
  const [selectedCajaId, setSelectedCajaId] = useState('');
  const [montoInicial, setMontoInicial] = useState('0');

  // Modales
  const [showModalMovimiento, setShowModalMovimiento] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO_MANUAL' | 'EGRESO_MANUAL'>('INGRESO_MANUAL');
  const [montoMovimiento, setMontoMovimiento] = useState('');
  const [descMovimiento, setDescMovimiento] = useState('');
  const [guardandoMov, setGuardandoMov] = useState(false);

  const [showModalCierre, setShowModalCierre] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [ticketZData, setTicketZData] = useState<any>(null);

  // Nueva Caja
  const [showModalNuevaCaja, setShowModalNuevaCaja] = useState(false);
  const [nuevaCajaNombre, setNuevaCajaNombre] = useState('');
  const [nuevaCajaDesc, setNuevaCajaDesc] = useState('');
  const [nuevaCajaPrefijo, setNuevaCajaPrefijo] = useState('');
  const [nuevaCajaPuntoVentaId, setNuevaCajaPuntoVentaId] = useState('');
  const [puntosVenta, setPuntosVenta] = useState<any[]>([]);
  const [guardandoNuevaCaja, setGuardandoNuevaCaja] = useState(false);
  const [errorNuevaCaja, setErrorNuevaCaja] = useState<string | null>(null);

  useEffect(() => {
    cargarEstado();
  }, []);

  const cargarEstado = async () => {
    try {
      const res = await api.get('/caja/estado');
      if (res.data.abierta) {
        setAbierta(true);
        setApertura(res.data.apertura);
        setTotalEsperado(res.data.totalEsperado);
        setIngresos(res.data.ingresos);
        setEgresos(res.data.egresos);
      } else {
        setAbierta(false);
        setApertura(null);
        cargarCajasFisicas();
      }
    } catch (err) {
      toast.error('Error al cargar estado de la caja');
    } finally {
      setCargando(false);
    }
  };

  const cargarCajasFisicas = async () => {
    try {
      const res = await api.get('/cajas-maestro');
      setCajasFisicas(res.data);
      if (res.data.length > 0) {
        setSelectedCajaId(res.data[0].id.toString());
      }
    } catch (err) {
      toast.error('Error al cargar lista de cajas');
    }
  };

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCajaId) {
      toast.error('Debes seleccionar una caja');
      return;
    }
    try {
      await api.post('/caja/abrir', {
        cajaId: Number(selectedCajaId),
        montoInicial: Number(montoInicial)
      });
      toast.success('Caja abierta correctamente');
      cargarEstado();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al abrir caja');
    }
  };

  const handleMovimientoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apertura) return;
    
    if (Number(montoMovimiento) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setGuardandoMov(true);
    try {
      await api.post('/caja/movimiento-manual', {
        aperturaCajaId: apertura.id,
        tipo: tipoMovimiento,
        monto: Number(montoMovimiento),
        concepto: descMovimiento
      });
      toast.success('Movimiento registrado');
      setShowModalMovimiento(false);
      setMontoMovimiento('');
      setDescMovimiento('');
      cargarEstado();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar movimiento');
    } finally {
      setGuardandoMov(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apertura) return;

    if (Number(montoContado) < 0) {
      toast.error('El monto no puede ser negativo');
      return;
    }

    setCerrandoCaja(true);
    try {
      const res = await api.post('/caja/cerrar', {
        aperturaCajaId: apertura.id,
        totalContado: Number(montoContado),
        observaciones: 'Cierre de turno'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const dif = Number(res.data.diferencia);
      if (dif === 0) {
        toast.success('Caja cerrada con éxito. El arqueo dio exacto.');
      } else if (dif > 0) {
        toast.success(`Caja cerrada. Sobraron $${dif.toFixed(2)}`);
      } else {
        toast.error(`Caja cerrada. Faltaron $${Math.abs(dif).toFixed(2)}`);
      }
      
      setShowModalCierre(false);
      setMontoContado('');
      
      // Armar data para Ticket Z
      setTicketZData({
        fecha: new Date().toLocaleString('es-AR'),
        cajero: usuario?.nombre,
        cajaNombre: apertura?.caja.nombre,
        esperado: totalEsperado,
        contado: res.data.totalContado,
        diferencia: res.data.diferencia
      });

      // Dar tiempo al DOM para renderizar el ticket antes de imprimir
      setTimeout(() => {
        window.print();
        cargarEstado();
      }, 100);
      
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || 'Error al cerrar caja');
    } finally {
      setCerrandoCaja(false);
    }
  };

  const handleAbrirModalNuevaCaja = async () => {
    setNuevaCajaNombre('');
    setNuevaCajaDesc('');
    setNuevaCajaPrefijo('');
    setErrorNuevaCaja(null);
    setShowModalNuevaCaja(true);
    
    try {
      const res = await api.get('/puntos-venta');
      setPuntosVenta(res.data);
      if (res.data.length > 0) {
        setNuevaCajaPuntoVentaId(res.data[0].id.toString());
      }
    } catch (err) {
      toast.error('Error al cargar puntos de venta');
    }
  };

  const handleCrearCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoNuevaCaja(true);
    setErrorNuevaCaja(null);

    try {
      await api.post('/cajas-maestro', {
        nombre: nuevaCajaNombre,
        descripcion: nuevaCajaDesc,
        prefijo: nuevaCajaPrefijo,
        puntoVentaId: Number(nuevaCajaPuntoVentaId)
      });
      
      toast.success('Caja creada correctamente');
      setShowModalNuevaCaja(false);
      cargarCajasFisicas();
    } catch (err: any) {
      setErrorNuevaCaja(err.response?.data?.error || 'Error al crear la caja');
    } finally {
      setGuardandoNuevaCaja(false);
    }
  };

  if (cargando) {
    return <div className="h-full flex items-center justify-center text-gray-500 font-medium">Cargando estado...</div>;
  }

  // VISTA: CAJA CERRADA
  if (!abierta) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <Wallet size={48} className="text-brand-light" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Apertura de Caja</h2>
            <p className="text-gray-500 text-center mt-2 text-sm">
              Seleccioná la caja física y declará el efectivo inicial (cambio) para empezar a operar.
            </p>
          </div>

          <form onSubmit={handleAbrirCaja} className="flex flex-col gap-5">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-bold text-gray-700">Seleccionar Caja Física</label>
                {usuario?.rol !== 'CAJERO' && (
                  <button
                    type="button"
                    onClick={handleAbrirModalNuevaCaja}
                    className="text-xs font-bold text-brand-light hover:text-blue-500 transition-colors"
                  >
                    + Nueva Caja
                  </button>
                )}
              </div>
              <select
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                value={selectedCajaId}
                onChange={e => setSelectedCajaId(e.target.value)}
                required
              >
                {cajasFisicas.length === 0 ? (
                  <option value="" disabled>No hay cajas configuradas</option>
                ) : (
                  cajasFisicas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.prefijo})</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Monto Inicial (Fondo de caja)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full p-3 pl-8 text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                  value={montoInicial}
                  onChange={e => setMontoInicial(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedCajaId}
              className="w-full py-4 mt-2 bg-brand-light text-brand-dark font-bold text-lg rounded-xl hover:bg-blue-400 transition-colors shadow-sm disabled:opacity-50"
            >
              ABRIR CAJA
            </button>
          </form>
        </div>

        {/* Modal Nueva Caja */}
        {showModalNuevaCaja && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Crear Nueva Caja</h2>
                <button onClick={() => setShowModalNuevaCaja(false)} className="text-gray-400 hover:text-gray-800"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleCrearCaja} className="p-5 flex flex-col gap-4">
                
                {errorNuevaCaja && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{errorNuevaCaja}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej: Caja 2"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                    value={nuevaCajaNombre}
                    onChange={e => setNuevaCajaNombre(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                    value={nuevaCajaDesc}
                    onChange={e => setNuevaCajaDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Prefijo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: C2"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 uppercase"
                    value={nuevaCajaPrefijo}
                    onChange={e => setNuevaCajaPrefijo(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-gray-500 mt-1">Identificador corto. Se usará en reportes y tickets para saber de dónde salió el movimiento.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Punto de Venta Asociado *</label>
                  <select
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                    value={nuevaCajaPuntoVentaId}
                    onChange={e => setNuevaCajaPuntoVentaId(e.target.value)}
                    required
                  >
                    {puntosVenta.map(pv => (
                      <option key={pv.id} value={pv.id}>{pv.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModalNuevaCaja(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardandoNuevaCaja} className="flex-1 py-3 bg-brand-dark text-white font-bold rounded-lg hover:bg-black disabled:opacity-50 shadow-md">
                    {guardandoNuevaCaja ? 'Creando...' : 'Crear Caja'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISTA: CAJA ABIERTA (DASHBOARD)
  return (
    <div className="h-full flex flex-col bg-gray-50 p-0 overflow-hidden print:bg-white print:overflow-visible">
      
      {/* Todo esto se oculta al imprimir */}
      <div className="flex flex-col h-full p-6 overflow-hidden print:hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-none">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Wallet /> Operación de Caja: {apertura?.caja.nombre}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Cajero: {usuario?.nombre}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setTipoMovimiento('INGRESO_MANUAL'); setShowModalMovimiento(true); }}
            className="px-4 py-2 bg-green-50 text-green-700 font-bold border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 shadow-sm"
          >
            <ArrowUpCircle size={18} /> Registrar Ingreso
          </button>
          <button
            onClick={() => { setTipoMovimiento('EGRESO_MANUAL'); setShowModalMovimiento(true); }}
            className="px-4 py-2 bg-orange-50 text-orange-700 font-bold border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2 shadow-sm"
          >
            <ArrowUpCircle size={18} className="transform rotate-180" /> Registrar Retiro
          </button>
          <button
            onClick={() => setShowModalCierre(true)}
            className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <AlertCircle size={18} /> CERRAR CAJA
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 flex-none">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-gray-400 text-sm font-semibold mb-1 uppercase">Monto Inicial</div>
          <div className="text-2xl font-bold text-gray-700">${Number(apertura?.montoInicial).toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-gray-400 text-sm font-semibold mb-1 uppercase">Ventas / Ingresos</div>
          <div className="text-2xl font-bold text-green-600">${Number(ingresos).toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="text-gray-400 text-sm font-semibold mb-1 uppercase">Retiros / Egresos</div>
          <div className="text-2xl font-bold text-red-500">${Number(egresos).toFixed(2)}</div>
        </div>
        <div className="bg-brand-dark p-4 rounded-xl shadow-md flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <DollarSign size={80} />
          </div>
          <div className="text-brand-light/80 text-sm font-semibold mb-1 uppercase">Esperado en Caja</div>
          <div className="text-3xl font-extrabold text-white">${Number(totalEsperado).toFixed(2)}</div>
        </div>
      </div>

      {/* Historial (Tabla) */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-700 text-lg">Historial de Movimientos</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 border-b border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Hora</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Detalle</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {apertura?.movimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No hay movimientos registrados aún.</td>
                </tr>
              ) : (
                apertura?.movimientos.map(mov => {
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Movimiento Manual */}
      {showModalMovimiento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Registrar Movimiento</h2>
              <button onClick={() => setShowModalMovimiento(false)} className="text-gray-400 hover:text-gray-800"><X size={24} /></button>
            </div>
            <form onSubmit={handleMovimientoManual} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Movimiento</label>
                <div className={`p-3 rounded-lg text-center font-bold border-2 ${tipoMovimiento === 'INGRESO_MANUAL' ? 'border-green-500 bg-green-50 text-green-700' : 'border-orange-500 bg-orange-50 text-orange-700'}`}>
                  {tipoMovimiento === 'INGRESO_MANUAL' ? 'NUEVO INGRESO' : 'RETIRO DE EFECTIVO'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    className="w-full p-3 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 text-lg font-bold"
                    value={montoMovimiento}
                    onChange={e => setMontoMovimiento(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Concepto / Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago a proveedor, Cambio chico..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                  value={descMovimiento}
                  onChange={e => setDescMovimiento(e.target.value)}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setShowModalMovimiento(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" disabled={guardandoMov} className="flex-1 py-3 bg-brand-dark text-white font-bold rounded-lg hover:bg-black disabled:opacity-50 shadow-md">
                  {guardandoMov ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {showModalCierre && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-red-500">
            <div className="p-6 text-center border-b border-gray-100 bg-red-50/30">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4 shadow-sm">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cierre de Caja</h2>
              <p className="text-sm text-gray-500 mt-2">Vas a cerrar el turno actual. Contá el dinero en la caja e ingresalo a continuación.</p>
            </div>
            
            <form onSubmit={handleCerrarCaja} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Efectivo Real Contado *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    className="w-full p-4 pl-10 border-2 rounded-xl focus:outline-none focus:border-brand-light focus:ring-4 focus:ring-blue-100 bg-white text-3xl font-extrabold text-gray-800 shadow-inner"
                    value={montoContado}
                    onChange={e => setMontoContado(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => setShowModalCierre(false)} className="flex-1 py-3.5 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={cerrandoCaja || montoContado === ''} className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg shadow-red-200 flex justify-center items-center gap-2">
                  {cerrandoCaja ? 'Cerrando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div> {/* Fin del contenedor print:hidden */}

      {/* TICKET Z IMPRESIÓN (OCULTO EN PANTALLA, VISIBLE SOLO EN @media print) */}
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

          <div className="text-center mt-8 text-xs">
            <p>_______________________</p>
            <p className="mt-1">Firma Cajero</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Caja;
