import React, { useState, useEffect } from 'react';
import { Package, Search, Calendar, FileText, CheckCircle, AlertTriangle, Printer, User, Plus, Edit2, Filter, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ClienteModal from '../components/ClienteModal';

export default function FacturacionDiferida() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenta, setSelectedVenta] = useState<any | null>(null);
  
  // Clientes
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string>('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<any | null>(null);
  
  const [montoOperador, setMontoOperador] = useState<'>' | '<' | '='>('>');
  const [montoFiltro, setMontoFiltro] = useState<string>('');
  
  const [facturando, setFacturando] = useState(false);

  useEffect(() => {
    cargarVentas();
    cargarClientes();
  }, []);

  const cargarVentas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ventas/historial?sinCae=true&limit=100');
      setVentas(res.data.data || []);
      if (selectedVenta) {
        const todaviaExiste = (res.data.data || []).find((v:any) => v.id === selectedVenta.id);
        if (!todaviaExiste) setSelectedVenta(null);
      }
    } catch (error) {
      toast.error('Error al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const res = await api.get('/clientes');
      if (res.data && Array.isArray(res.data.data)) {
        setClientes(res.data.data);
      } else if (Array.isArray(res.data)) {
        setClientes(res.data);
      } else {
        setClientes([]);
      }
    } catch (err) {
      toast.error('Error al cargar clientes');
    }
  };

  const handleClienteSelect = (cliente: any | null) => {
    setShowClienteModal(false);
    setClienteAEditar(null);
    if (cliente) {
      // Refresh list to make sure it's in the dropdown
      cargarClientes();
      setClienteIdSeleccionado(cliente.id.toString());
    }
  };

  const ventasFiltradas = ventas.filter(v => {
    if (!montoFiltro) return true;
    const monto = parseFloat(montoFiltro);
    if (isNaN(monto)) return true;
    const totalVenta = Number(v.total);
    
    if (montoOperador === '>') return totalVenta > monto;
    if (montoOperador === '<') return totalVenta < monto;
    if (montoOperador === '=') return totalVenta === monto;
    return true;
  });

  const emitirFactura = async () => {
    if (!selectedVenta) return;
    if (!clienteIdSeleccionado) {
      toast.error('Debe seleccionar un cliente para facturar');
      return;
    }

    const cl = clientes.find(c => c.id.toString() === clienteIdSeleccionado);
    if (!cl || !cl.numeroDoc || !cl.condicionIva) {
      toast.error('El cliente debe tener un Documento (DNI/CUIT) y Condición de IVA registrados.');
      return;
    }

    try {
      setFacturando(true);
      const res = await api.post(`/ventas/${selectedVenta.id}/facturar-afip`, {
        clienteId: parseInt(clienteIdSeleccionado, 10)
      });
      toast.success('¡Factura electrónica emitida con éxito!', {
        duration: 5000,
      });
      cargarVentas();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error desconocido de AFIP', {
        duration: 8000,
        style: { border: '1px solid red', padding: '16px', fontWeight: 'bold' }
      });
    } finally {
      setFacturando(false);
    }
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      
      {/* Panel Izquierdo: Bandeja de Entrada */}
      <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col z-10 transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Package size={20} className="text-brand-light" />
            Pendientes de Facturación
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Comprobantes internos "X" listos para ser declarados en AFIP.
          </p>
        </div>
        
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1">
            <Filter size={14} />
            Filtrar por monto
          </label>
          <div className="flex gap-2">
            <select
              className="p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light transition-all shadow-sm"
              value={montoOperador}
              onChange={(e) => setMontoOperador(e.target.value as any)}
            >
              <option value=">">Mayor a</option>
              <option value="<">Menor a</option>
              <option value="=">Igual a</option>
            </select>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input 
                type="number"
                placeholder="0.00"
                className="w-full pl-7 pr-8 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light transition-all shadow-sm"
                value={montoFiltro}
                onChange={(e) => setMontoFiltro(e.target.value)}
              />
              {montoFiltro && (
                <button 
                  onClick={() => setMontoFiltro('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-red-50 dark:hover:bg-slate-700"
                  title="Limpiar filtro"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Cargando comprobantes...</div>
          ) : ventas.length === 0 ? (
            <div className="p-4 text-center text-gray-400 mt-10">
              <CheckCircle size={40} className="mx-auto mb-2 opacity-50" />
              Al día. No hay ventas sin facturar.
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="p-4 text-center text-gray-400 mt-10">
              No hay ventas que coincidan con el filtro.
            </div>
          ) : (
            ventasFiltradas.map(v => (
              <div 
                key={v.id} 
                onClick={() => { setSelectedVenta(v); setClienteIdSeleccionado(v.clienteId ? v.clienteId.toString() : ''); }}
                className={`p-3 border-b border-gray-100 dark:border-slate-700/50 cursor-pointer transition-colors rounded-lg mb-1
                  ${selectedVenta?.id === v.id ? 'bg-blue-50 dark:bg-slate-700 border-blue-200 dark:border-blue-900' : 'hover:bg-gray-50 dark:hover:bg-slate-750'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-700 dark:text-slate-200">Ticket #{v.id}</span>
                  <span className="text-sm font-bold text-brand-dark dark:text-brand-light">${Number(v.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
                  <span>{new Date(v.createdAt).toLocaleString()}</span>
                  <span className="bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded">{v.estado}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel Derecho: Área de Trabajo */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors">
        {selectedVenta ? (
          <div className="p-6 max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <FileText size={24} className="text-brand-light" />
              Facturar Ticket #{selectedVenta.id}
            </h2>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Asignar Cliente</h3>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-1">Buscar y seleccionar cliente existente:</label>
                  <select
                    className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 font-medium"
                    value={clienteIdSeleccionado}
                    onChange={(e) => setClienteIdSeleccionado(e.target.value)}
                  >
                    <option value="">-- Seleccione un cliente válido --</option>
                    {clientes.map(c => {
                      const isValid = c.numeroDoc && c.condicionIva && c.condicionIva !== 'Consumidor Final Sin Datos';
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.numeroDoc ? `(${c.numeroDoc})` : '(Sin Doc)'} {isValid ? '' : '- Faltan Datos'}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <button
                  disabled={!clienteIdSeleccionado}
                  onClick={() => {
                    const cl = clientes.find(c => c.id.toString() === clienteIdSeleccionado);
                    if (cl) {
                      setClienteAEditar(cl);
                      setShowClienteModal(true);
                    }
                  }}
                  className="p-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Editar cliente seleccionado"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => { setClienteAEditar(null); setShowClienteModal(true); }}
                  className="p-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg transition-colors font-bold flex items-center gap-2"
                  title="Registrar nuevo cliente"
                >
                  <Plus size={20} /> Nuevo
                </button>
              </div>

              {!clienteIdSeleccionado && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-sm rounded-lg flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>Es obligatorio asignar un cliente con CUIT/DNI y Condición de IVA para emitir una factura electrónica.</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Detalle de Ítems</h3>
              <table className="w-full text-left text-sm text-gray-600 dark:text-slate-300">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="p-2 font-bold">Producto</th>
                    <th className="p-2 font-bold text-center">Cant.</th>
                    <th className="p-2 font-bold text-right">P. Unitario</th>
                    <th className="p-2 font-bold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {selectedVenta.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-2 font-medium text-gray-800 dark:text-slate-200">{item.producto?.nombre}</td>
                      <td className="p-2 text-center">{item.cantidad}</td>
                      <td className="p-2 text-right">${Number(item.precioUnitario).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">${Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <div className="text-2xl font-black text-brand-dark dark:text-brand-light">
                  Total: ${Number(selectedVenta.total).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-auto flex justify-end gap-4 pb-10">
              <button
                disabled={!clienteIdSeleccionado || facturando}
                onClick={emitirFactura}
                className="px-6 py-4 bg-brand-light text-brand-dark font-black text-lg rounded-xl shadow-md hover:bg-blue-400 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {facturando ? 'Conectando con AFIP...' : 'Emitir Factura Electrónica'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Package size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">Seleccioná un comprobante de la lista para facturarlo.</p>
            </div>
          </div>
        )}
      </div>

      {showClienteModal && (
        <ClienteModal 
          onClose={() => { setShowClienteModal(false); setClienteAEditar(null); }}
          onSelect={handleClienteSelect}
          clienteAEditar={clienteAEditar}
          requiereDatosFiscales={true}
        />
      )}
    </div>
  );
}
