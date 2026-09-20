import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, Printer, X, Tag, Search, Plus, Trash2, AlertCircle, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JsBarcode from 'jsbarcode';

interface Producto {
  id: number;
  nombre: string;
  nombre: string;
  codigoBarras: string;
  precioVenta: number;
  categoriaId?: number;
}

interface Categoria {
  id: number;
  nombre: string;
}

interface ItemCola {
  producto: Producto;
  cantidad: number;
}

const DEFAULT_FORMATO = {
  anchoMm: 40,
  altoMm: 25,
  columnas: 3,
  margenSuperiorMm: 5,
  margenIzquierdoMm: 5,
  espacioHorizontalMm: 2,
  espacioVerticalMm: 2
};

const EtiquetasImpresion = () => {
  const { usuario } = useAuth();
  const [formato, setFormato] = useState(DEFAULT_FORMATO);
  const [showConfig, setShowConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarPrecio, setMostrarPrecio] = useState(false);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriasLista, setCategoriasLista] = useState<Categoria[]>([]);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState(''); // Placeholder

  const [cola, setCola] = useState<ItemCola[]>([]);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    cargarFormato();
    cargarParametroPrecio();
    cargarCatalogos();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarProductos();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [filtroCategoria, filtroFechaDesde, filtroFechaHasta]);

  useEffect(() => {
    if (showConfig) {
      setTimeout(() => {
        const svgNode = document.getElementById('barcode-preview');
        if (svgNode) {
          JsBarcode(svgNode, "2000000000015", {
            format: "EAN13",
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 14,
            margin: 0
          });
        }
      }, 50); // pequeñísimo delay para que renderice el modal
    }
  }, [showConfig]);

  const cargarFormato = async () => {
    try {
      const res = await api.get('/parametros/formatoEtiqueta');
      if (res.data?.valor) {
        setFormato(JSON.parse(res.data.valor));
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        toast.error('Error al cargar formato de etiquetas');
      }
    }
  };

  const cargarParametroPrecio = async () => {
    try {
      const res = await api.get('/parametros/etiquetaMostrarPrecio');
      if (res.data?.valor) {
        setMostrarPrecio(res.data.valor === 'true');
      }
    } catch (err) {
      // Ignorar si no existe
    }
  };

  const cargarCatalogos = async () => {
    try {
      const res = await api.get('/categorias');
      setCategoriasLista(res.data);
    } catch (err) {
      toast.error('Error al cargar categorías');
    }
  };

  const cargarProductos = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroCategoria) params.append('categoriaId', filtroCategoria);
      if (filtroFechaDesde) params.append('fechaDesde', filtroFechaDesde);
      if (filtroFechaHasta) params.append('fechaHasta', filtroFechaHasta);

      const res = await api.get('/productos', { params });
      setProductos(res.data.filter((p: any) => p.codigoBarras));
    } catch (err) {
      toast.error('Error al cargar productos');
    }
  };

  const hayFiltrosActivos = busqueda.length > 0 || filtroCategoria !== '' || filtroFechaDesde !== '' || filtroFechaHasta !== '' || filtroProveedor !== '';

  const productosFiltrados = hayFiltrosActivos
    ? productos.filter(p => {
        const matchBusqueda = busqueda ? (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigoBarras.includes(busqueda)) : true;
        // Proveedor is just a placeholder for now, so we always pass it if we don't have the data
        return matchBusqueda;
      })
    : [];

  const agregarACola = (prod: Producto) => {
    const existe = cola.find(i => i.producto.id === prod.id);
    if (existe) {
      setCola(cola.map(i => i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCola([...cola, { producto: prod, cantidad: 1 }]);
    }
    toast.success('Agregado a la cola');
  };

  const eliminarDeCola = (id: number) => {
    setCola(cola.filter(i => i.producto.id !== id));
  };

  const actualizarCantidad = (id: number, cantidad: string) => {
    const val = parseInt(cantidad, 10);
    if (isNaN(val) || val < 1) return;
    setCola(cola.map(i => i.producto.id === id ? { ...i, cantidad: val } : i));
  };

  const aplanarCola = () => {
    const lista: Producto[] = [];
    cola.forEach(item => {
      for (let i = 0; i < item.cantidad; i++) {
        lista.push(item.producto);
      }
    });
    return lista;
  };

  const handleImprimir = () => {
    if (cola.length === 0) return;
    setImprimiendo(true);
  };

  useEffect(() => {
    if (imprimiendo) {
      setTimeout(() => {
        const aplanada = aplanarCola();
        aplanada.forEach((prod, index) => {
          const svgNode = document.getElementById(`barcode-print-${index}`);
          if (svgNode) {
            JsBarcode(svgNode, prod.codigoBarras, {
              format: "EAN13",
              width: 1.5,
              height: 40,
              displayValue: true,
              fontSize: 14,
              margin: 0
            });
          }
        });
        window.print();
      }, 100);
    }
  }, [imprimiendo, cola]);

  useEffect(() => {
    const onAfterPrint = () => setImprimiendo(false);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const guardarFormato = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.put('/parametros/formatoEtiqueta', { valor: JSON.stringify(formato) });
      toast.success('Formato de etiquetas guardado');
      setShowConfig(false);
    } catch (err) {
      toast.error('Error al guardar formato');
    } finally {
      setGuardando(false);
    }
  };

  const handleFormatoChange = (campo: keyof typeof DEFAULT_FORMATO, valor: string) => {
    setFormato(prev => ({ ...prev, [campo]: Number(valor) }));
  };

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-slate-900 print:p-0 print:bg-white print:h-auto transition-colors duration-200">
      
      {/* HEADER - OCULTO EN IMPRESION */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-3">
          <Tag className="text-brand-light" size={32} />
          Impresión de Etiquetas
        </h1>
        {usuario?.rol !== 'CAJERO' && (
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
          >
            <Settings size={18} /> Configurar Formato
          </button>
        )}
      </div>

      <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg flex items-start gap-3 print:hidden">
        <AlertCircle className="shrink-0 mt-0.5" size={20} />
        <div className="text-sm">
          <p className="font-bold mb-1">Tip para imprimir</p>
          <p>Para asegurar que las medidas salgan exactas, recordá configurar en el navegador <strong>Escala: Predeterminada (100%)</strong> y <strong>Márgenes: Ninguno</strong> al momento de imprimir.</p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL - OCULTO EN IMPRESION */}
      <div className="flex flex-1 gap-6 overflow-hidden print:hidden">
        
        {/* PANEL IZQUIERDO: Buscador y Filtros */}
        <div className="w-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-col gap-3 transition-colors">
            <h2 className="font-bold text-gray-700 dark:text-slate-300">Buscar y Filtrar</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Nombre o código..."
                className="w-full pl-10 pr-4 py-2 text-sm border dark:border-slate-600 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <select 
                  className="w-full p-2 text-xs border dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300"
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                >
                  <option value="">Categoría (Todas)</option>
                  {categoriasLista.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                <input 
                  type="date" 
                  title="Fecha desde"
                  className="w-1/2 p-2 text-xs border dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300"
                  value={filtroFechaDesde}
                  onChange={e => setFiltroFechaDesde(e.target.value)}
                />
                <input 
                  type="date" 
                  title="Fecha hasta"
                  className="w-1/2 p-2 text-xs border dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300"
                  value={filtroFechaHasta}
                  onChange={e => setFiltroFechaHasta(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <select 
                  className="w-full p-2 text-xs border dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-light bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                  value={filtroProveedor}
                  onChange={e => setFiltroProveedor(e.target.value)}
                  disabled
                  title="Próximamente"
                >
                  <option value="">Proveedor (Próximamente)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {hayFiltrosActivos ? (
              productosFiltrados.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {productosFiltrados.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-slate-600 transition-colors">
                      <div className="overflow-hidden">
                        <div className="font-bold text-gray-800 dark:text-slate-200 truncate" title={prod.nombre}>{prod.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-1">{prod.codigoBarras}</div>
                      </div>
                      <button 
                        onClick={() => agregarACola(prod)}
                        className="ml-2 shrink-0 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 hover:text-blue-800 dark:hover:text-blue-300 rounded-lg transition-colors"
                        title="Agregar a la cola"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 dark:text-slate-500 p-8 text-sm">No se encontraron productos con código de barras que coincidan.</p>
              )
            ) : (
              <div className="text-center text-gray-400 dark:text-slate-500 p-8 flex flex-col items-center gap-3">
                <Filter size={32} className="opacity-20" />
                <p className="text-sm">Aplicá algún filtro o buscá un producto para agregarlo a la cola.</p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Cola de Impresión */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center transition-colors">
            <h2 className="font-bold text-gray-700 dark:text-slate-300">Cola de Impresión</h2>
            <span className="bg-brand-light text-brand-dark px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              {aplanarCola().length} etiquetas totales
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cola.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 gap-4">
                <Printer size={48} className="opacity-20" />
                <p>La cola está vacía.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-white dark:bg-slate-800 sticky top-0 border-b border-gray-100 dark:border-slate-700 z-10 shadow-sm transition-colors">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Producto</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-24">Cantidad</th>
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {cola.map(item => (
                    <tr key={item.producto.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800 dark:text-slate-200">{item.producto.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">{item.producto.codigoBarras}</div>
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={e => actualizarCantidad(item.producto.id, e.target.value)}
                          className="w-16 p-2 text-center border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => eliminarDeCola(item.producto.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 transition-colors">
            <button
              onClick={handleImprimir}
              disabled={cola.length === 0 || imprimiendo}
              className="w-full py-4 bg-brand-light text-brand-dark font-bold text-lg rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
            >
              <Printer size={24} />
              {imprimiendo ? 'Generando vista previa...' : 'Imprimir Etiquetas'}
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESIÓN - VISIBLE SOLO AL IMPRIMIR */}
      <div 
        className="hidden print:block w-full bg-white text-black"
        style={{
          paddingTop: `${formato.margenSuperiorMm}mm`,
          paddingLeft: `${formato.margenIzquierdoMm}mm`,
        }}
      >
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${formato.columnas}, 1fr)`,
            gap: `${formato.espacioVerticalMm}mm ${formato.espacioHorizontalMm}mm`,
          }}
        >
          {imprimiendo && aplanarCola().map((prod, idx) => (
            <div 
              key={`${prod.id}-${idx}`}
              className="flex flex-col justify-between p-1 bg-white border border-gray-300"
              style={{
                width: `${formato.anchoMm}mm`,
                height: `${formato.altoMm}mm`,
                pageBreakInside: 'avoid'
              }}
            >
              <div className="text-[10px] font-bold truncate leading-tight text-center">{prod.nombre}</div>
              <div className="flex-1 flex items-center justify-center overflow-hidden my-1">
                <svg id={`barcode-print-${idx}`} className="w-full h-full object-contain"></svg>
              </div>
              {mostrarPrecio && (
                <div className="text-xs font-extrabold text-right mt-0.5">${Number(prod.precioVenta).toFixed(2)}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Configuración */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex overflow-hidden max-h-[90vh] transition-colors">
            
            {/* Formulario */}
            <div className="w-1/2 flex flex-col border-r border-gray-100 dark:border-slate-700">
              <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Tamaño de Etiqueta (mm)</h2>
                <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-slate-200">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={guardarFormato} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ancho Etiqueta</label>
                    <input type="number" required min="10" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.anchoMm} onChange={e => handleFormatoChange('anchoMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alto Etiqueta</label>
                    <input type="number" required min="10" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.altoMm} onChange={e => handleFormatoChange('altoMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Columnas por hoja</label>
                    <input type="number" required min="1" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.columnas} onChange={e => handleFormatoChange('columnas', e.target.value)} />
                  </div>
                  <div className="col-span-2 border-t border-gray-100 dark:border-slate-700 my-2 pt-4">
                    <h3 className="font-bold text-gray-700 dark:text-slate-300 mb-3">Márgenes de Hoja</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Superior</label>
                    <input type="number" required min="0" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.margenSuperiorMm} onChange={e => handleFormatoChange('margenSuperiorMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Izquierdo</label>
                    <input type="number" required min="0" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.margenIzquierdoMm} onChange={e => handleFormatoChange('margenIzquierdoMm', e.target.value)} />
                  </div>
                  <div className="col-span-2 border-t border-gray-100 dark:border-slate-700 my-2 pt-4">
                    <h3 className="font-bold text-gray-700 dark:text-slate-300 mb-3">Espaciado entre etiquetas</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Espacio Horizontal</label>
                    <input type="number" required min="0" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.espacioHorizontalMm} onChange={e => handleFormatoChange('espacioHorizontalMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Espacio Vertical</label>
                    <input type="number" required min="0" className="w-full p-2 border dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-1 focus:ring-brand-light focus:outline-none" value={formato.espacioVerticalMm} onChange={e => handleFormatoChange('espacioVerticalMm', e.target.value)} />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                  <button type="submit" disabled={guardando} className="flex-1 py-3 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-400 disabled:opacity-50">
                    {guardando ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </form>
            </div>

            {/* Vista Previa a escala aproximada */}
            <div className="w-1/2 bg-gray-100 dark:bg-slate-900 p-6 flex flex-col">
              <h3 className="font-bold text-gray-500 dark:text-slate-400 mb-4 uppercase tracking-wider text-sm">Vista Previa Aproximada</h3>
              <div className="flex-1 bg-gray-200 dark:bg-slate-800 rounded flex items-center justify-center p-8 overflow-hidden relative border border-dashed border-gray-300 dark:border-slate-600">
                {/* Simulación de la etiqueta, asumiendo 1mm = 4px para la vista previa */}
                <div 
                  className="bg-white border border-gray-300 shadow-sm flex flex-col justify-between p-2"
                  style={{
                    width: `${formato.anchoMm * 4}px`,
                    height: `${formato.altoMm * 4}px`
                  }}
                >
                  <div className="text-[10px] font-bold truncate leading-tight text-center text-black">Producto de Ejemplo Largo</div>
                  <div className="flex-1 flex items-center justify-center my-1 overflow-hidden">
                    <svg id="barcode-preview" className="w-full h-full object-contain"></svg>
                  </div>
                  <div className="text-xs font-extrabold text-right mt-0.5 text-black">$1.500,00</div>
                </div>
                
                {/* Cotas informativas */}
                <div className="absolute bottom-4 text-xs text-gray-500 font-medium">
                  {formato.anchoMm}mm x {formato.altoMm}mm
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default EtiquetasImpresion;
