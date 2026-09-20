import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Categoria {
  id: number;
  nombre: string;
  subcategorias?: Categoria[];
}

interface ProductoValorizado {
  id: number;
  codigoBarras: string | null;
  nombre: string;
  stockActual: number;
  precioCosto: number;
  totalValorizado: number;
  categoriaId?: number;
  categoria?: {
    nombre: string;
    categoriaPadreId?: number | null;
  };
}

const StockValorizado = () => {
  const [productos, setProductos] = useState<ProductoValorizado[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [categoriasLista, setCategoriasLista] = useState<Categoria[]>([]);
  
  // Filtros frontend
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    cargarCatalogos();
    cargarStockValorizado();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const res = await api.get('/categorias');
      setCategoriasLista(res.data);
    } catch (err) {
      toast.error('Error al cargar categorías');
    }
  };

  const cargarStockValorizado = async () => {
    try {
      setCargando(true);
      const res = await api.get('/stock/valorizado');
      setProductos(res.data.items);
    } catch (err) {
      toast.error('Error al cargar el stock valorizado');
    } finally {
      setCargando(false);
    }
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(monto);
  };

  // Filtrado local
  const productosFiltrados = productos.filter(p => {
    const textoMatch = 
      p.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) || 
      (p.codigoBarras && p.codigoBarras.includes(filtroTexto));
      
    let catMatch = true;
    if (filtroCategoria) {
      const catId = Number(filtroCategoria);
      // Coincide si el producto tiene esa categoria exacta, o si su categoria padre es esa
      catMatch = p.categoriaId === catId || p.categoria?.categoriaPadreId === catId;
    }

    return textoMatch && catMatch;
  });

  const totalInmovilizadoFiltro = productosFiltrados.reduce((acc, p) => acc + p.totalValorizado, 0);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-slate-200">Stock Valorizado</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Análisis del capital inmovilizado en el inventario</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* COLUMNA IZQUIERDA: TABLA */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-200">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 transition-colors">
            <h2 className="font-bold text-gray-700 dark:text-slate-200">Detalle de Productos Activos</h2>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 transition-colors">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-32">Código</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Producto</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-24">Cant.</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-32">Costo Unit.</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-40">Valorizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {cargando ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-slate-500">Calculando inventario...</td>
                  </tr>
                ) : productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-slate-500">No hay productos en stock.</td>
                  </tr>
                ) : (
                  productosFiltrados.map(prod => (
                    <tr key={prod.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 text-sm text-gray-600 dark:text-slate-400 font-mono">{prod.codigoBarras || '-'}</td>
                      <td className="p-4 text-sm font-medium text-gray-800 dark:text-slate-200">
                        {prod.nombre}
                        {prod.categoria && (
                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{prod.categoria.nombre}</div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-right font-bold text-gray-700 dark:text-slate-200">{prod.stockActual}</td>
                      <td className="p-4 text-sm text-right text-gray-600 dark:text-slate-400">{formatearMoneda(prod.precioCosto)}</td>
                      <td className="p-4 text-sm text-right font-bold text-brand-dark dark:text-slate-200">{formatearMoneda(prod.totalValorizado)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y FILTROS */}
        <div className="w-80 flex flex-col gap-6">
          
          {/* RESUMEN TOTAL */}
          <div className="bg-brand-dark text-white rounded-lg shadow-sm border-b-4 border-brand-light p-6">
            <div className="flex items-center gap-3 mb-2 opacity-80">
              <DollarSign size={20} />
              <h2 className="text-sm font-bold uppercase tracking-wider">Capital Inmovilizado</h2>
            </div>
            <div className="text-4xl font-extrabold tracking-tight">
              {cargando ? '...' : formatearMoneda(totalInmovilizadoFiltro)}
            </div>
            <p className="text-xs text-gray-300 mt-4 opacity-80">
              Suma total del costo de todos los productos en stock.
            </p>
          </div>

          {/* FILTROS */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-5 flex-1 overflow-y-auto transition-colors duration-200">
            <h2 className="font-bold text-gray-700 dark:text-slate-200 uppercase text-xs tracking-wider border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center gap-2 transition-colors">
              <Search size={14} /> Filtros de Búsqueda
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Buscar Producto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Nombre o código..."
                  className="w-full pl-9 pr-3 py-2 text-sm border dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                  value={filtroTexto}
                  onChange={e => setFiltroTexto(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Categoría</label>
              <select 
                className="w-full p-2 text-sm border dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-light transition-colors"
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
            
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700 transition-colors">
              <div className="text-sm text-gray-500 dark:text-slate-400 font-medium text-center bg-gray-50 dark:bg-slate-900/50 py-2 rounded transition-colors">
                {productosFiltrados.length} productos listados
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StockValorizado;
