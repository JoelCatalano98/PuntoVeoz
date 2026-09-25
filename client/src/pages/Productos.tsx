import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Package, Barcode, FileSpreadsheet, Printer, Image as ImageIcon } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { exportarProductosExcel } from '../services/exportar.service';
import { imprimirEtiquetas } from '../services/etiquetas.service';

interface Categoria {
  id: number;
  nombre: string;
  color: string;
  subcategorias?: Categoria[];
}

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  codigoBarras?: string;
  precioCosto: number;
  precioVenta: number;
  ivaIncluido?: boolean;
  rentabilidad?: number;
  stockActual: number;
  stockMinimo: number;
  stockIdeal?: number;
  imagenUrl?: string;
  activo: boolean;
  categoria?: {
    id: number;
    nombre: string;
    color: string;
    categoriaPadreId?: number | null;
  };
  unidadMedidaId?: number;
  categoriaId?: number;
}

const Productos = () => {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Filtros Backend
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroPrecioOp, setFiltroPrecioOp] = useState('>');
  const [filtroPrecio, setFiltroPrecio] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    codigoBarras: '',
    precioCosto: '',
    precioVenta: '',
    ivaIncluido: true,
    rentabilidad: '',
    stockActual: '0',
    stockMinimo: '0',
    stockIdeal: '',
    categoriaId: '',
    subcategoriaId: '',
    unidadMedidaId: '',
    proveedorId: '',
  });

  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  const [categoriasLista, setCategoriasLista] = useState<Categoria[]>([]);
  const [unidadesLista, setUnidadesLista] = useState<any[]>([]);
  const [proveedoresLista, setProveedoresLista] = useState<any[]>([]);

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarProductos(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [filtroCategoria, filtroProveedor, filtroPrecioOp, filtroPrecio, filtroFecha, filtro]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nuevo') === 'true') {
      abrirModalNuevo();
      navigate('/productos', { replace: true });
    }
  }, [location.search]);

  const barcodeRef = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (mostrarModal && barcodeRef.current && formData.codigoBarras) {
      try {
        JsBarcode(barcodeRef.current, formData.codigoBarras, {
          format: 'EAN13',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 14,
          margin: 0
        });
      } catch (error) {
        try {
          JsBarcode(barcodeRef.current, formData.codigoBarras, {
            format: 'CODE128',
            width: 2,
            height: 40,
            displayValue: true,
            fontSize: 14,
            margin: 0
          });
        } catch (e) {}
      }
    }
  }, [formData.codigoBarras, mostrarModal]);

  const cargarCatalogos = async () => {
    try {
      const [catRes, uniRes, provRes] = await Promise.all([
        api.get('/categorias'),
        api.get('/unidades-medida'),
        api.get('/proveedores')
      ]);
      setCategoriasLista(catRes.data);
      setUnidadesLista(uniRes.data);
      setProveedoresLista(provRes.data);
    } catch (err) {
      toast.error('Error al cargar datos anexos');
    }
  };

  const cargarProductos = async (pageToLoad = page) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pageToLoad.toString());
      params.append('limit', limit.toString());
      if (filtro) params.append('search', filtro);
      if (filtroCategoria) params.append('categoriaId', filtroCategoria);
      if (filtroProveedor) params.append('proveedorId', filtroProveedor);
      if (filtroPrecio) {
        if (filtroPrecioOp === '=') params.append('precioExacto', filtroPrecio);
        else if (filtroPrecioOp === '>') params.append('precioMin', filtroPrecio);
        else if (filtroPrecioOp === '<') params.append('precioMax', filtroPrecio);
      }
      if (filtroFecha) {
        params.append('fechaDesde', filtroFecha);
        params.append('fechaHasta', filtroFecha);
      }

      const res = await api.get('/productos', { params });
      setProductos(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.totalCount);
      setPage(pageToLoad);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setProductoEditando(null);
    setImagenArchivo(null);
    setImagenPreview(null);
    setFormData({
      nombre: '',
      codigoBarras: '',
      precioCosto: '',
      precioVenta: '',
      ivaIncluido: true,
      rentabilidad: '',
      stockActual: '0',
      stockMinimo: '0',
      stockIdeal: '',
      categoriaId: '',
      subcategoriaId: '',
      unidadMedidaId: '',
      proveedorId: '',
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (prod: Producto) => {
    setProductoEditando(prod);
    setImagenArchivo(null);
    setImagenPreview(prod.imagenUrl ? `http://localhost:4000${prod.imagenUrl}` : null);
    
    // Determinar categoría y subcategoría
    let catId = '';
    let subCatId = '';
    if (prod.categoriaId) {
      const parent = categoriasLista.find(c => c.subcategorias?.some(sc => sc.id === prod.categoriaId));
      if (parent) {
        catId = parent.id.toString();
        subCatId = prod.categoriaId.toString();
      } else {
        catId = prod.categoriaId.toString();
      }
    }

    setFormData({
      nombre: prod.nombre,
      codigoBarras: prod.codigoBarras || '',
      precioCosto: prod.precioCosto.toString(),
      precioVenta: prod.precioVenta.toString(),
      ivaIncluido: prod.ivaIncluido !== false,
      rentabilidad: prod.rentabilidad ? prod.rentabilidad.toString() : '',
      stockActual: prod.stockActual.toString(),
      stockMinimo: prod.stockMinimo.toString(),
      stockIdeal: prod.stockIdeal ? prod.stockIdeal.toString() : '',
      categoriaId: catId,
      subcategoriaId: subCatId,
      unidadMedidaId: prod.unidadMedidaId?.toString() || '',
      proveedorId: (prod as any).proveedorId?.toString() || '',
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setProductoEditando(null);
  };

  const handleImagenCambio = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagenArchivo(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  // Cálculo de Precios
  const handlePrecioCostoChange = (val: string) => {
    const costo = parseFloat(val) || 0;
    const renta = parseFloat(formData.rentabilidad) || 0;
    const nuevoVenta = costo + (costo * (renta / 100));
    setFormData({ ...formData, precioCosto: val, precioVenta: nuevoVenta > 0 ? nuevoVenta.toFixed(2) : '' });
  };

  const handleRentabilidadChange = (val: string) => {
    const renta = parseFloat(val) || 0;
    const costo = parseFloat(formData.precioCosto) || 0;
    const nuevoVenta = costo + (costo * (renta / 100));
    setFormData({ ...formData, rentabilidad: val, precioVenta: nuevoVenta > 0 ? nuevoVenta.toFixed(2) : '' });
  };

  const handlePrecioVentaChange = (val: string) => {
    const venta = parseFloat(val) || 0;
    const costo = parseFloat(formData.precioCosto) || 0;
    let nuevaRenta = '';
    if (costo > 0 && venta > costo) {
      nuevaRenta = (((venta - costo) / costo) * 100).toFixed(2);
    }
    setFormData({ ...formData, precioVenta: val, rentabilidad: nuevaRenta });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setGuardando(true);

    const formDataPayload = new FormData();
    formDataPayload.append('nombre', formData.nombre.trim());
    if (formData.codigoBarras) formDataPayload.append('codigoBarras', formData.codigoBarras.trim());
    formDataPayload.append('precioCosto', formData.precioCosto);
    formDataPayload.append('precioVenta', formData.precioVenta);
    formDataPayload.append('ivaIncluido', String(formData.ivaIncluido));
    if (formData.rentabilidad) formDataPayload.append('rentabilidad', formData.rentabilidad);
    if (!productoEditando) formDataPayload.append('stockActual', formData.stockActual || '0');
    formDataPayload.append('stockMinimo', formData.stockMinimo || '0');
    if (formData.stockIdeal) formDataPayload.append('stockIdeal', formData.stockIdeal);
    
    // Mandar subcategoriaId si existe, sino categoriaId
    const catFinal = formData.subcategoriaId || formData.categoriaId;
    if (catFinal) formDataPayload.append('categoriaId', catFinal);
    if (formData.unidadMedidaId) formDataPayload.append('unidadMedidaId', formData.unidadMedidaId);
    if (formData.proveedorId) formDataPayload.append('proveedorId', formData.proveedorId);
    formDataPayload.append('activo', 'true');

    if (imagenArchivo) {
      formDataPayload.append('imagen', imagenArchivo);
    }

    try {
      if (productoEditando) {
        await api.put(`/productos/${productoEditando.id}`, formDataPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Producto actualizado exitosamente');
      } else {
        await api.post('/productos', formDataPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Producto creado exitosamente');
      }
      cerrarModal();
      cargarProductos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Error al guardar el producto');
    } finally {
      setGuardando(false);
    }
  };

  // AJUSTE DE STOCK
  const [mostrarModalAjuste, setMostrarModalAjuste] = useState(false);
  const [productoAjuste, setProductoAjuste] = useState<Producto | null>(null);
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const [ajusteData, setAjusteData] = useState({
    tipo: 'ENTRADA',
    cantidad: '',
    motivo: ''
  });

  const abrirModalAjuste = (prod: Producto) => {
    setProductoAjuste(prod);
    setAjusteData({ tipo: 'ENTRADA', cantidad: '', motivo: '' });
    setMostrarModalAjuste(true);
  };

  const handleAjusteStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoAjuste) return;
    if (Number(ajusteData.cantidad) <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    
    setGuardandoAjuste(true);
    try {
      await api.post(`/stock/ajustar`, {
        productoId: productoAjuste.id,
        tipo: ajusteData.tipo,
        cantidad: Number(ajusteData.cantidad),
        motivo: ajusteData.motivo
      });
      toast.success('Stock actualizado exitosamente');
      setMostrarModalAjuste(false);
      cargarProductos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al ajustar stock');
    } finally {
      setGuardandoAjuste(false);
    }
  };

  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const StockObligatorio = true;

  const handleGenerarCodigo = async () => {
    if (!productoEditando) return;
    setGenerandoCodigo(true);
    try {
      const res = await api.post(`/productos/${productoEditando.id}/codigo-barras`);
      setFormData(prev => ({ ...prev, codigoBarras: res.data.codigoBarras }));
      toast.success('Código generado correctamente');
      cargarProductos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al generar código');
    } finally {
      setGenerandoCodigo(false);
    }
  };

  const handleImprimirEtiqueta = (prod: Producto) => {
    const cantStr = window.prompt(`¿Cuántas etiquetas de "${prod.nombre}" querés imprimir?`, '1');
    if (cantStr === null) return;
    const cant = parseInt(cantStr, 10);
    if (isNaN(cant) || cant <= 0) {
      toast.error('Cantidad inválida');
      return;
    }
    imprimirEtiquetas([{ producto: prod, cantidad: cant }]);
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
      try {
        await api.put(`/productos/${id}`, { activo: false });
        toast.success('Producto eliminado');
        cargarProductos();
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const filtrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
    (p.codigoBarras && p.codigoBarras.includes(filtro))
  );

  // Subcategorias filtradas para el select anidado
  const subcategoriasDisponibles = categoriasLista.find(c => c.id.toString() === formData.categoriaId)?.subcategorias || [];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-brand-light">Gestión de Productos</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Administrá tu inventario y precios</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* COLUMNA IZQUIERDA: TABLA */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-200">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
            <h2 className="font-bold text-gray-700 dark:text-slate-200">Catálogo</h2>
            {puedeEditar && (
              <button 
                onClick={abrirModalNuevo}
                className="bg-brand-light text-brand-dark px-4 py-2 rounded-lg font-bold hover:bg-blue-300 transition-colors flex items-center gap-2 shadow-sm text-sm"
              >
                <Plus size={16} />
                Nuevo Producto
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-16 text-center">Foto</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-32">Código</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-32">P. Costo</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-32">P. Venta</th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right w-24">Stock</th>
                  {puedeEditar && (
                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center w-28">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">Cargando productos...</td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">No se encontraron productos</td>
                  </tr>
                ) : (
                  filtrados.map(prod => {
                    const bajoStock = Number(prod.stockActual) <= Number(prod.stockMinimo);
                    return (
                      <tr 
                        key={prod.id} 
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors"
                        style={{ backgroundColor: prod.categoria?.color ? `${prod.categoria.color}1A` : undefined }}
                      >
                        <td className="p-4 text-center">
                          {prod.imagenUrl ? (
                            <img 
                              src={`http://localhost:4000${prod.imagenUrl}`} 
                              alt={prod.nombre}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-600 mx-auto"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center mx-auto text-gray-400 dark:text-slate-500">
                              <Package size={20} />
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-slate-400 font-mono">{prod.codigoBarras || '-'}</td>
                        <td className="p-4 text-sm font-medium text-gray-800 dark:text-slate-200">
                          {prod.nombre}
                          <div className="flex gap-2">
                            {prod.categoria && (
                              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">{prod.categoria.nombre}</div>
                            )}
                            {(prod as any).proveedor && (
                              <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {(prod as any).proveedor.razonSocial}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-right text-gray-600 dark:text-slate-400">${Number(prod.precioCosto).toFixed(2)}</td>
                        <td className="p-4 text-sm text-right font-bold text-brand-dark dark:text-brand-light">${Number(prod.precioVenta).toFixed(2)}</td>
                        <td className="p-4 text-sm text-right">
                          <span className={`inline-flex items-center gap-1 font-bold ${bajoStock ? 'text-red-500' : 'text-green-600'}`}>
                            {bajoStock && <AlertTriangle size={14} />}
                            {prod.stockActual}
                          </span>
                        </td>
                        {puedeEditar && (
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => abrirModalAjuste(prod)}
                                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors bg-white/50 dark:bg-slate-800/50"
                                title="Ajuste de Stock"
                              >
                                <Package size={16} />
                              </button>
                              <button 
                                onClick={() => abrirModalEditar(prod)}
                                className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors bg-white/50 dark:bg-slate-800/50"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              {prod.codigoBarras && (
                                <button 
                                  onClick={() => handleImprimirEtiqueta(prod)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded transition-colors bg-white/50 dark:bg-slate-800/50"
                                  title="Imprimir Etiqueta"
                                >
                                  <Printer size={16} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleEliminar(prod.id)}
                                className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors bg-white/50 dark:bg-slate-800/50"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: FILTROS */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-5 overflow-y-auto transition-colors duration-200">
          <h2 className="font-bold text-gray-700 dark:text-slate-200 uppercase text-xs tracking-wider border-b border-gray-100 dark:border-slate-700 pb-2">Filtros de Búsqueda</h2>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Buscar Producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Nombre o código..."
                className="w-full pl-9 pr-3 py-2 text-sm border dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder-gray-400 dark:placeholder-slate-500"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Categoría</label>
            <select 
              className="w-full p-2 text-sm border dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900"
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

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Proveedor</label>
            <select 
              className="w-full p-2 text-sm border dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900"
              value={filtroProveedor}
              onChange={e => setFiltroProveedor(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {proveedoresLista.map(prov => (
                <option key={prov.id} value={prov.id}>{prov.razonSocial}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Precio de Venta</label>
            <div className="flex gap-2">
              <select 
                className="w-16 p-2 text-sm border dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-light"
                value={filtroPrecioOp}
                onChange={e => setFiltroPrecioOp(e.target.value)}
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="=">=</option>
              </select>
              <input 
                type="number" 
                placeholder="Monto..." 
                className="flex-1 p-2 text-sm border dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500" 
                value={filtroPrecio}
                onChange={e => setFiltroPrecio(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Actualizado el</label>
            <input 
              type="date" 
              className="w-full p-2 text-sm border dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900" 
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
            />
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-3">
            <button
              onClick={() => exportarProductosExcel(filtrados)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
              title="Exportar la lista actual a Excel"
            >
              <FileSpreadsheet size={18} />
              Exportar a Excel
            </button>
            <div className="text-sm text-gray-500 dark:text-slate-400 font-medium text-center bg-gray-50 dark:bg-slate-900/50 py-2 rounded">
              {filtrados.length} resultados
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FORMULARIO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] transition-colors duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-brand-dark dark:text-brand-light">
                {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="producto-form" onSubmit={handleGuardar} className="flex flex-col gap-6">
                
                {/* SECCIÓN FOTO Y DATOS BÁSICOS */}
                <div className="flex gap-6 items-start">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center bg-gray-50 dark:bg-slate-900/50 overflow-hidden relative group">
                      {imagenPreview ? (
                        <img src={imagenPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400 dark:text-slate-500">
                          <ImageIcon size={32} />
                          <span className="text-xs mt-1">Sin foto</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-opacity">
                        Cambiar
                        <input type="file" accept="image/*" className="hidden" onChange={handleImagenCambio} />
                      </label>
                    </div>
                    {imagenPreview && (
                      <button type="button" onClick={() => { setImagenArchivo(null); setImagenPreview(null); }} className="text-xs text-red-500 font-bold hover:underline">
                        Quitar foto
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        autoFocus
                        className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900"
                        value={formData.nombre}
                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Código de Barras</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light font-mono bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900"
                          value={formData.codigoBarras}
                          onChange={e => setFormData({...formData, codigoBarras: e.target.value})}
                        />
                        {puedeEditar && productoEditando && !formData.codigoBarras && (
                          <button
                            type="button"
                            onClick={handleGenerarCodigo}
                            disabled={generandoCodigo}
                            className="px-4 py-2 border border-brand-light text-brand-dark rounded-lg hover:bg-brand-light/10 font-bold disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-2"
                          >
                            <Barcode size={18} />
                            {generandoCodigo ? 'Generando...' : 'Generar Código'}
                          </button>
                        )}
                      </div>
                      {formData.codigoBarras && (
                        <div className="mt-2 p-2 bg-white border border-gray-200 rounded-lg flex justify-center items-center print:bg-white print:border-none">
                          <svg ref={barcodeRef} style={{ maxHeight: 60 }}></svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECCIÓN CATEGORIZACIÓN */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-100 dark:border-slate-700">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Categoría Padre *</label>
                    <select
                      required
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.categoriaId}
                      onChange={e => setFormData({...formData, categoriaId: e.target.value, subcategoriaId: ''})}
                    >
                      <option value="">(Seleccione)</option>
                      {categoriasLista.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Subcategoría (Opcional)</label>
                    <select
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500"
                      value={formData.subcategoriaId}
                      onChange={e => setFormData({...formData, subcategoriaId: e.target.value})}
                      disabled={!formData.categoriaId || subcategoriasDisponibles.length === 0}
                    >
                      <option value="">(Sin subcategoría)</option>
                      {subcategoriasDisponibles.map((sub: Categoria) => (
                        <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Unidad de Medida *</label>
                    <select
                      required
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.unidadMedidaId}
                      onChange={e => setFormData({...formData, unidadMedidaId: e.target.value})}
                    >
                      <option value="">(Seleccione)</option>
                      {unidadesLista.map(uni => (
                        <option key={uni.id} value={uni.id}>{uni.nombre} {uni.abreviatura ? `(${uni.abreviatura})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Proveedor (Opcional)</label>
                    <select
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.proveedorId}
                      onChange={e => setFormData({...formData, proveedorId: e.target.value})}
                    >
                      <option value="">(Sin proveedor)</option>
                      {proveedoresLista.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.razonSocial}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECCIÓN PRECIOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-l-4 border-brand-light pl-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Costo ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.precioCosto}
                      onChange={e => handlePrecioCostoChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Rentabilidad (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.rentabilidad}
                      onChange={e => handleRentabilidadChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Precio Venta ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light font-bold text-brand-dark dark:text-brand-light bg-blue-50 dark:bg-blue-900/30"
                      value={formData.precioVenta}
                      onChange={e => handlePrecioVentaChange(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ivaIncluido"
                      className="w-4 h-4 text-brand-light rounded focus:ring-brand-light"
                      checked={formData.ivaIncluido}
                      onChange={e => setFormData({...formData, ivaIncluido: e.target.checked})}
                    />
                    <label htmlFor="ivaIncluido" className="text-sm font-bold text-gray-600 dark:text-slate-300">
                      El precio de venta incluye IVA
                    </label>
                  </div>
                </div>

                {/* SECCIÓN STOCK */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Stock Actual {StockObligatorio ? '*' : ''}</label>
                    <input
                      type="number"
                      step="1"
                      required={StockObligatorio}
                      disabled={!!productoEditando}
                      className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.stockActual}
                      onChange={e => setFormData({...formData, stockActual: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Stock Mínimo {StockObligatorio ? '*' : ''}</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required={StockObligatorio}
                      className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.stockMinimo}
                      onChange={e => setFormData({...formData, stockMinimo: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Stock Ideal (Opcional)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                      value={formData.stockIdeal}
                      onChange={e => setFormData({...formData, stockIdeal: e.target.value})}
                    />
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
              <button 
                type="button" 
                onClick={cerrarModal}
                className="px-5 py-2.5 text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="producto-form"
                disabled={guardando}
                className="px-5 py-2.5 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-400 disabled:opacity-50 transition-colors shadow-sm"
              >
                {guardando ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL AJUSTE DE STOCK */}
      {mostrarModalAjuste && productoAjuste && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col transition-colors duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-brand-dark dark:text-brand-light flex items-center gap-2">
                  <Package size={20} /> Ajuste Manual de Stock
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{productoAjuste.nombre}</p>
              </div>
              <button onClick={() => setMostrarModalAjuste(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-5 flex justify-between items-center border border-blue-100 dark:border-blue-800">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Stock Actual:</span>
                <span className="text-xl font-black text-blue-900 dark:text-blue-200">{productoAjuste.stockActual}</span>
              </div>

              <form onSubmit={handleAjusteStock} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Tipo de Ajuste</label>
                  <select
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 font-semibold"
                    value={ajusteData.tipo}
                    onChange={e => setAjusteData({...ajusteData, tipo: e.target.value})}
                  >
                    <option value="ENTRADA">ENTRADA (Sumar stock)</option>
                    <option value="SALIDA">SALIDA (Restar stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    autoFocus
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 text-lg font-bold"
                    value={ajusteData.cantidad}
                    onChange={e => setAjusteData({...ajusteData, cantidad: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Motivo / Concepto *</label>
                  <input
                    type="text"
                    required
                    placeholder={ajusteData.tipo === 'ENTRADA' ? "Ej: Ingreso mercadería, Devolución..." : "Ej: Rotura, Vencimiento, Merma..."}
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
                    value={ajusteData.motivo}
                    onChange={e => setAjusteData({...ajusteData, motivo: e.target.value})}
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setMostrarModalAjuste(false)} className="flex-1 py-3 text-gray-600 dark:text-slate-300 font-bold bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg">Cancelar</button>
                  <button type="submit" disabled={guardandoAjuste} className="flex-1 py-3 bg-brand-dark dark:bg-brand-light text-white dark:text-brand-dark font-bold rounded-lg hover:bg-black dark:hover:bg-white disabled:opacity-50 shadow-md">
                    {guardandoAjuste ? 'Guardando...' : 'Confirmar Ajuste'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Productos;
