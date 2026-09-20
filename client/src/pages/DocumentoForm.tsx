import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, Save, X, Plus, Trash2, User as UserIcon, AlertCircle, ShoppingCart } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  precioVenta: number;
  stockActual: number;
}

interface Cliente {
  id: number;
  nombre: string;
  numeroDoc: string | null;
  direccion: string | null;
  condicionIva: string | null;
  razonSocial: string | null;
}

interface ItemForm {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

const DocumentoForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEdit = !!id;
  const tipoParam = searchParams.get('tipo'); // PRESUPUESTO | REMITO
  const tipoDoc = isEdit ? 'PRESUPUESTO' : (tipoParam === 'REMITO' ? 'REMITO_PENDIENTE' : 'PRESUPUESTO');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosResult, setProductosResult] = useState<Producto[]>([]);
  const [items, setItems] = useState<ItemForm[]>([]);

  // Refs para clicks outside etc
  const searchProdRef = useRef<HTMLDivElement>(null);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    cargarClientes();
    if (isEdit) {
      cargarVentaEdicion();
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (busquedaProducto.length > 1) {
        buscarProductos(busquedaProducto);
      } else {
        setProductosResult([]);
        setShowProdDrop(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [busquedaProducto]);

  const cargarClientes = async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data.data || res.data); // Support paginated or array
    } catch (err) {
      toast.error('Error al cargar clientes');
    }
  };

  const cargarVentaEdicion = async () => {
    try {
      setCargando(true);
      const res = await api.get(`/ventas/${id}`);
      const v = res.data;
      if (v.estado !== 'PRESUPUESTO') {
        toast.error('Sólo se pueden editar Presupuestos');
        navigate('/ventas-historial');
        return;
      }
      if (v.cliente) {
        setClienteSeleccionado(v.cliente);
      }
      setItems(v.items.map((i: any) => ({
        producto: i.producto,
        cantidad: Number(i.cantidad),
        subtotal: Number(i.subtotal)
      })));
    } catch (err) {
      toast.error('Error al cargar el documento');
      navigate('/ventas-historial');
    } finally {
      setCargando(false);
    }
  };

  const buscarProductos = async (q: string) => {
    try {
      const res = await api.get('/productos', { params: { search: q, limit: 10 } });
      setProductosResult(res.data.data || res.data);
      setShowProdDrop(true);
    } catch (err) {
      console.error(err);
    }
  };

  const agregarProducto = (prod: Producto) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto.id === prod.id);
      if (existe) {
        return prev.map(i => i.producto.id === prod.id 
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * Number(i.producto.precioVenta) } 
          : i);
      }
      return [...prev, { producto: prod, cantidad: 1, subtotal: Number(prod.precioVenta) }];
    });
    setBusquedaProducto('');
    setShowProdDrop(false);
  };

  const updateCantidad = (index: number, val: number) => {
    if (val < 1) return;
    const newItems = [...items];
    newItems[index].cantidad = val;
    newItems[index].subtotal = val * Number(newItems[index].producto.precioVenta);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!clienteSeleccionado) {
      toast.error('Debe seleccionar un cliente.');
      return;
    }
    if (!clienteSeleccionado.numeroDoc || !clienteSeleccionado.direccion || !clienteSeleccionado.condicionIva) {
      toast.error('El cliente debe tener CUIT/DNI, Dirección y Condición de IVA para emitir este documento.');
      return;
    }
    if (items.length === 0) {
      toast.error('Debe agregar al menos un producto.');
      return;
    }

    setGuardando(true);
    try {
      // 1. Obtener una cajaId (aunque no se cobra, la API crearVenta lo exige si está en la validación, aunque para presupuestos se podría usar 1 o modificar el backend)
      // Como crearVenta exige aperturaCajaId, vamos a obtener la caja abierta actual. Si no hay, fallará.
      const resCaja = await api.get('/caja/estado');
      let aperturaCajaId = 1; // Default fallback if allowed
      if (resCaja.data.abierta) {
        aperturaCajaId = resCaja.data.apertura.id;
      } else {
        toast.error('Debe abrir la caja primero, incluso para crear documentos.');
        setGuardando(false);
        return;
      }

      const payload = {
        aperturaCajaId,
        clienteId: clienteSeleccionado.id,
        items: items.map(i => ({
          productoId: i.producto.id,
          cantidad: i.cantidad
        })),
        montoRecibido: 0,
        medioPago: 'EFECTIVO',
        estado: tipoDoc
      };

      if (isEdit) {
        // Hacemos PUT
        await api.put(`/ventas/${id}`, payload);
        toast.success('Documento actualizado correctamente');
      } else {
        await api.post('/ventas', payload);
        toast.success(`${tipoDoc === 'PRESUPUESTO' ? 'Presupuesto' : 'Remito'} creado correctamente`);
      }
      navigate('/ventas-historial?tab=' + (tipoDoc === 'PRESUPUESTO' ? 'PRESUPUESTO' : 'REMITOS'));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el documento');
    } finally {
      setGuardando(false);
    }
  };

  const totalGral = items.reduce((acc, i) => acc + i.subtotal, 0);

  if (cargando) return <div className="p-8 text-center text-gray-500">Cargando documento...</div>;

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-brand-light flex items-center gap-2">
            <ShoppingCart className="text-brand-light" size={26} /> 
            {isEdit ? `Editar Presupuesto #${id}` : `Nuevo ${tipoDoc === 'PRESUPUESTO' ? 'Presupuesto' : 'Remito'}`}
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Formulario de emisión de documentos formales</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-bold transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando} className="px-4 py-2 bg-brand-light dark:bg-blue-500 text-brand-dark dark:text-white rounded-lg hover:bg-blue-400 dark:hover:bg-blue-600 font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
            <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar Documento'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        <div className="w-1/3 flex flex-col gap-6">
          {/* PANEL CLIENTE */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 flex flex-col transition-colors duration-200">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center gap-2">
              <UserIcon size={18} className="text-gray-400 dark:text-slate-500" /> Datos del Cliente
            </h2>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Seleccionar Cliente</label>
              <select 
                className="w-full p-2.5 border dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-light outline-none"
                value={clienteSeleccionado?.id || ''}
                onChange={e => {
                  const c = clientes.find(x => x.id === Number(e.target.value));
                  setClienteSeleccionado(c || null);
                }}
              >
                <option value="">Seleccione un cliente...</option>
                {clientes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.numeroDoc ? `(${c.numeroDoc})` : ''}</option>
                ))}
              </select>
            </div>

            {clienteSeleccionado && (
              <div className={`p-4 rounded-lg border ${(!clienteSeleccionado.numeroDoc || !clienteSeleccionado.direccion || !clienteSeleccionado.condicionIva) ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700'}`}>
                <div className="font-bold text-gray-800 dark:text-slate-200 mb-1">{clienteSeleccionado.razonSocial || clienteSeleccionado.nombre}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">CUIT/DNI:</span> {clienteSeleccionado.numeroDoc || <span className="text-red-500 dark:text-red-400 flex items-center gap-1 inline-flex"><AlertCircle size={12}/>Falta</span>}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">Cond. IVA:</span> {clienteSeleccionado.condicionIva || <span className="text-red-500 dark:text-red-400 flex items-center gap-1 inline-flex"><AlertCircle size={12}/>Falta</span>}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  <span className="font-semibold text-gray-700 dark:text-slate-300">Dirección:</span> {clienteSeleccionado.direccion || <span className="text-red-500 dark:text-red-400 flex items-center gap-1 inline-flex"><AlertCircle size={12}/>Falta</span>}
                </div>
                
                {(!clienteSeleccionado.numeroDoc || !clienteSeleccionado.direccion || !clienteSeleccionado.condicionIva) && (
                  <div className="mt-3 text-xs text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/50 p-2 rounded">
                    El cliente está incompleto. Vaya a "Clientes" para actualizar sus datos antes de emitir.
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* TOTALES */}
          <div className="bg-brand-dark dark:bg-slate-800 rounded-xl shadow-sm border border-brand-dark dark:border-slate-700 p-6 flex flex-col justify-center text-white mt-auto transition-colors duration-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-light/80 dark:text-slate-400 mb-1">Total del Documento</h2>
            <div className="text-4xl font-black font-mono tracking-tight text-white dark:text-brand-light">${totalGral.toFixed(2)}</div>
            <div className="text-sm mt-4 pt-4 border-t border-white/10 dark:border-slate-700 flex justify-between">
              <span className="text-brand-light dark:text-slate-400">Ítems Totales:</span>
              <span className="font-bold dark:text-slate-200">{items.reduce((acc, i) => acc + i.cantidad, 0)}</span>
            </div>
          </div>
        </div>

        <div className="w-2/3 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors duration-200">
          {/* BUSCADOR PRODUCTOS */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex gap-4" ref={searchProdRef}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o código de barras para agregar..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light shadow-sm text-base text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                onFocus={() => { if(productosResult.length > 0) setShowProdDrop(true) }}
              />
              
              {showProdDrop && productosResult.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {productosResult.map((p) => (
                    <div 
                      key={p.id} 
                      className="p-3 border-b dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => agregarProducto(p)}
                    >
                      <div>
                        <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{p.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">{p.codigoBarras || 'Sin código'}</div>
                      </div>
                      <div className="font-bold text-brand-dark dark:text-brand-light">${Number(p.precioVenta).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LISTA ITEMS */}
          <div className="flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                <Search size={48} className="mb-4 text-gray-300 dark:text-slate-600" />
                <p className="text-lg font-bold text-gray-400 dark:text-slate-500">Sin productos</p>
                <p className="text-sm text-gray-400 dark:text-slate-500">Buscá y agregá productos a la lista</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 shadow-sm border-b border-gray-100 dark:border-slate-700 z-10">
                  <tr>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Producto</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-32">Cant.</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right w-28">Precio U.</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right w-28">Subtotal</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{item.producto.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">{item.producto.codigoBarras || 'S/N'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center border dark:border-slate-600 rounded-lg overflow-hidden w-24 mx-auto bg-white dark:bg-slate-900">
                          <button 
                            className="px-2 py-1 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold transition-colors"
                            onClick={() => updateCantidad(idx, item.cantidad - 1)}
                          >-</button>
                          <input 
                            type="number" 
                            className="w-10 text-center font-bold text-sm outline-none border-x dark:border-slate-600 py-1 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                            value={item.cantidad}
                            onChange={(e) => updateCantidad(idx, Number(e.target.value) || 1)}
                          />
                          <button 
                            className="px-2 py-1 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold transition-colors"
                            onClick={() => updateCantidad(idx, item.cantidad + 1)}
                          >+</button>
                        </div>
                      </td>
                      <td className="p-3 text-right text-sm font-medium text-gray-600 dark:text-slate-400">${Number(item.producto.precioVenta).toFixed(2)}</td>
                      <td className="p-3 text-right text-sm font-bold text-brand-dark dark:text-brand-light">${item.subtotal.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentoForm;
