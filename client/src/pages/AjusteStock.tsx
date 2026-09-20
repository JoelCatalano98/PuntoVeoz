import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Save, ClipboardList, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Categoria {
  id: number;
  nombre: string;
  subcategorias?: Categoria[];
}

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string;
  stockActual: number;
}

const AjusteStock = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categoriasLista, setCategoriasLista] = useState<Categoria[]>([]);
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidad, setCantidad] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categorias');
        setCategoriasLista(res.data);
      } catch (err) {}
    };
    fetchCats();
  }, []);

  useEffect(() => {
    // Buscar si hay texto de búsqueda o si se cambió la categoría (y hay algo escrito para no traer todo)
    if ((busqueda.trim().length > 2 || filtroCategoria) && !productoSeleccionado) {
      const delay = setTimeout(() => {
        buscarProductos();
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setProductosEncontrados([]);
    }
  }, [busqueda, filtroCategoria, productoSeleccionado]);

  const buscarProductos = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroCategoria) params.append('categoriaId', filtroCategoria);

      const res = await api.get('/productos', { params });
      let filtrados = res.data;

      if (busqueda.trim()) {
        filtrados = filtrados.filter((p: any) => 
          p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
          (p.codigoBarras && p.codigoBarras.includes(busqueda))
        );
      }
      
      setProductosEncontrados(filtrados.slice(0, 10));
    } catch (err) {
      console.error(err);
    }
  };

  const seleccionarProducto = (prod: Producto) => {
    setProductoSeleccionado(prod);
    setBusqueda(prod.nombre);
    setProductosEncontrados([]);
  };

  const limpiarSeleccion = () => {
    setProductoSeleccionado(null);
    setBusqueda('');
    setCantidad('');
    setMotivo('');
    setObservaciones('');
    setTipo('ENTRADA');
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionado) return toast.error('Debe seleccionar un producto');
    if (!cantidad || Number(cantidad) <= 0) return toast.error('Ingrese una cantidad válida mayor a 0');
    if (!motivo) return toast.error('Seleccione un motivo');

    if (tipo === 'SALIDA' && Number(cantidad) > productoSeleccionado.stockActual) {
      return toast.error('No puede dar de baja más stock del que hay disponible.');
    }

    setGuardando(true);
    try {
      await api.post('/stock/ajustar', {
        productoId: productoSeleccionado.id,
        tipo,
        cantidad: Number(cantidad),
        motivo,
        observaciones
      });

      toast.success('Stock ajustado correctamente');
      limpiarSeleccion();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al ajustar el stock');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-slate-200 flex items-center gap-2">
            <ClipboardList className="text-brand-light" size={26} /> Ajuste Manual de Stock
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Corregí el inventario de forma trazable (mermas, roturas, errores).
          </p>
        </div>
        <button 
          onClick={() => navigate('/historial-stock')}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          Ver Historial
        </button>
      </div>

      <div className="flex-1 flex gap-6 max-w-5xl mx-auto w-full">
        {/* Panel de Búsqueda */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 flex flex-col h-full transition-colors duration-200">
            <h2 className="font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2 transition-colors">
              <Search size={18} className="text-gray-400" /> 1. Buscar Producto
            </h2>
            
            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escribí nombre o código (min 3 letras)..."
                  className={`w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-brand-light outline-none transition-colors ${productoSeleccionado ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-300 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-gray-200 dark:border-slate-600 placeholder-gray-400 dark:placeholder-slate-500'}`}
                  value={busqueda}
                  onChange={e => {
                    if (productoSeleccionado) limpiarSeleccion();
                    setBusqueda(e.target.value);
                  }}
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                {productoSeleccionado && (
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 font-bold text-lg"
                    onClick={limpiarSeleccion}
                  >
                    &times;
                  </button>
                )}
              </div>

              {!productoSeleccionado && (
                <div className="relative">
                  <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select 
                    className="w-full p-3 pl-10 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-light outline-none bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 appearance-none transition-colors"
                    value={filtroCategoria}
                    onChange={e => setFiltroCategoria(e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    {categoriasLista.map(cat => (
                      <optgroup key={cat.id} label={cat.nombre}>
                        <option value={cat.id}>{cat.nombre} (Principal)</option>
                        {cat.subcategorias?.map(sub => (
                          <option key={sub.id} value={sub.id}>↳ {sub.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!productoSeleccionado && (
              <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                {productosEncontrados.map(prod => (
                  <div 
                    key={prod.id} 
                    className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-blue-100 dark:hover:border-slate-600 rounded-lg cursor-pointer flex justify-between items-center transition-colors"
                    onClick={() => seleccionarProducto(prod)}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{prod.nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 font-mono">{prod.codigoBarras || 'S/N'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold">Stock Actual</div>
                      <div className="font-mono font-bold text-lg text-brand-dark dark:text-slate-200">{prod.stockActual}</div>
                    </div>
                  </div>
                ))}
                {(busqueda.length > 2 || filtroCategoria) && productosEncontrados.length === 0 && (
                  <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-8 transition-colors">
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            )}

            {productoSeleccionado && (
              <div className="mt-6 p-6 bg-blue-50/50 dark:bg-slate-700/30 rounded-lg border border-blue-100 dark:border-slate-600 text-center flex flex-col items-center justify-center flex-1 transition-colors">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4 transition-colors">
                  <ClipboardList className="text-brand-light" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200">{productoSeleccionado.nombre}</h3>
                <p className="text-gray-500 dark:text-slate-400 font-mono mb-4">{productoSeleccionado.codigoBarras || 'Sin código'}</p>
                <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
                  <span className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase mr-2">Stock Actual:</span>
                  <span className="text-2xl font-bold font-mono text-brand-dark dark:text-slate-200">{productoSeleccionado.stockActual}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Ajuste */}
        <div className="w-1/2">
          <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 h-full transition-all duration-300 flex flex-col ${!productoSeleccionado ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h2 className="font-bold text-gray-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b dark:border-slate-700 pb-2 transition-colors">
              <Plus size={18} className="text-gray-400" /> 2. Detalles del Ajuste
            </h2>
            
            <form onSubmit={handleGuardar} className="flex flex-col gap-5 flex-1">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Tipo de Ajuste *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipo('ENTRADA')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border ${tipo === 'ENTRADA' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    >
                      <Plus size={16} /> Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('SALIDA')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border ${tipo === 'SALIDA' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' : 'bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    >
                      <Minus size={16} /> Egreso
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Cantidad *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-brand-light outline-none font-mono text-lg text-center transition-colors"
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {productoSeleccionado && cantidad && (
                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 text-center mt-2 transition-colors">
                  <span className="text-sm font-bold text-gray-500 dark:text-slate-400">Stock Resultante Estimado: </span>
                  <span className="text-lg font-bold font-mono text-brand-dark dark:text-slate-200">
                    {tipo === 'ENTRADA' 
                      ? Number(productoSeleccionado.stockActual) + Number(cantidad) 
                      : Number(productoSeleccionado.stockActual) - Number(cantidad)
                    }
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Motivo *</label>
                <select
                  required
                  className="w-full p-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-light outline-none transition-colors"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                >
                  <option value="">Seleccione un motivo...</option>
                  <option value="Merma">Merma (Vencimiento / Desperdicio)</option>
                  <option value="Rotura">Rotura / Daño</option>
                  <option value="Diferencia de Inventario">Diferencia de Inventario (Conteo)</option>
                  <option value="Carga Inicial">Carga Inicial / Saldo Inicial</option>
                  <option value="Devolucion a Proveedor">Devolución a Proveedor</option>
                  <option value="Otro">Otro (Especificar en observaciones)</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Observaciones (Opcional)</label>
                <textarea
                  className="w-full p-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-brand-light outline-none h-24 resize-none transition-colors"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Detalles adicionales sobre este ajuste..."
                />
              </div>

              <button
                type="submit"
                disabled={guardando || !productoSeleccionado}
                className="w-full bg-brand-dark text-white p-3 rounded-lg font-bold hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md mt-4"
              >
                <Save size={20} />
                {guardando ? 'Guardando...' : 'Confirmar Ajuste de Stock'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjusteStock;
