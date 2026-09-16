import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  codigoBarras?: string;
  precioCosto: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
  categoria?: {
    id: number;
    nombre: string;
    color: string;
  };
}

const Productos = () => {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);

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
    stockActual: '',
    stockMinimo: '',
    categoriaId: '',
    unidadMedidaId: '',
  });

  const [categoriasLista, setCategoriasLista] = useState<any[]>([]);
  const [unidadesLista, setUnidadesLista] = useState<any[]>([]);

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    cargarProductos();
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [catRes, uniRes] = await Promise.all([
        api.get('/categorias'),
        api.get('/unidades-medida')
      ]);
      setCategoriasLista(catRes.data);
      setUnidadesLista(uniRes.data);
    } catch (err) {
      toast.error('Error al cargar datos anexos');
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await api.get('/productos');
      setProductos(res.data);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setProductoEditando(null);
    setFormData({
      nombre: '',
      codigoBarras: '',
      precioCosto: '',
      precioVenta: '',
      stockActual: '0',
      stockMinimo: '0',
      categoriaId: '',
      unidadMedidaId: '',
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (prod: Producto & { categoriaId?: number, unidadMedidaId?: number }) => {
    setProductoEditando(prod as Producto);
    setFormData({
      nombre: prod.nombre,
      codigoBarras: prod.codigoBarras || '',
      precioCosto: prod.precioCosto.toString(),
      precioVenta: prod.precioVenta.toString(),
      stockActual: prod.stockActual.toString(),
      stockMinimo: prod.stockMinimo.toString(),
      categoriaId: prod.categoriaId?.toString() || '',
      unidadMedidaId: prod.unidadMedidaId?.toString() || '',
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setProductoEditando(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setGuardando(true);

    // Formatear payload seguro
    const payload = {
      nombre: formData.nombre.trim(),
      codigoBarras: formData.codigoBarras.trim() || undefined,
      precioCosto: Number(parseFloat(formData.precioCosto).toFixed(2)) || 0,
      precioVenta: Number(parseFloat(formData.precioVenta).toFixed(2)) || 0,
      stockActual: productoEditando ? undefined : (parseInt(formData.stockActual, 10) || 0),
      stockMinimo: parseInt(formData.stockMinimo, 10) || 0,
      categoriaId: formData.categoriaId ? parseInt(formData.categoriaId, 10) : null,
      unidadMedidaId: formData.unidadMedidaId ? parseInt(formData.unidadMedidaId, 10) : null,
      activo: true
    };

    try {
      if (productoEditando) {
        // En edición, excluyo explícitamente el stockActual porque no se debe tocar por acá
        const { stockActual, ...updatePayload } = payload;
        await api.put(`/productos/${productoEditando.id}`, updatePayload);
        toast.success('Producto actualizado exitosamente');
      } else {
        await api.post('/productos', payload);
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
      await api.post(`/productos/${productoAjuste.id}/ajuste-stock`, {
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

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Gestión de Productos</h1>
          <p className="text-gray-500 text-sm mt-1">Administrá tu inventario y precios</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* COLUMNA IZQUIERDA: TABLA */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-700">Catálogo</h2>
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
              <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Código</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-32">P. Costo</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-32">P. Venta</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-24">Stock</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-24">Min.</th>
                  {puedeEditar && (
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                    const bajoStock = prod.stockActual <= prod.stockMinimo;
                    return (
                      <tr 
                        key={prod.id} 
                        className="hover:bg-blue-50/50 transition-colors"
                        style={{ backgroundColor: prod.categoria?.color ? `${prod.categoria.color}1A` : undefined }}
                      >
                        <td className="p-4 text-sm text-gray-600 font-mono">{prod.codigoBarras || '-'}</td>
                        <td className="p-4 text-sm font-medium text-gray-800">{prod.nombre}</td>
                        <td className="p-4 text-sm text-right text-gray-600">${Number(prod.precioCosto).toFixed(2)}</td>
                        <td className="p-4 text-sm text-right font-bold text-brand-dark">${Number(prod.precioVenta).toFixed(2)}</td>
                        <td className="p-4 text-sm text-right">
                          <span className={`inline-flex items-center gap-1 font-bold ${bajoStock ? 'text-red-500' : 'text-green-600'}`}>
                            {bajoStock && <AlertTriangle size={14} />}
                            {prod.stockActual}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-right text-gray-500">{prod.stockMinimo}</td>
                        {puedeEditar && (
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => abrirModalAjuste(prod)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors bg-white/50"
                                title="Ajuste de Stock"
                              >
                                <Package size={16} />
                              </button>
                              <button 
                                onClick={() => abrirModalEditar(prod)}
                                className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors bg-white/50"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleEliminar(prod.id)}
                                className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors bg-white/50"
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
        <div className="w-72 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-5 overflow-y-auto">
          <h2 className="font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-100 pb-2">Filtros de Búsqueda</h2>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Buscar Producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Nombre o código..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white transition-colors"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
            <select className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light text-gray-600 bg-white">
              <option value="">Todas las categorías</option>
              {categoriasLista.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Precio de Venta</label>
            <div className="flex gap-2">
              <select className="w-16 p-2 text-sm border rounded-md bg-white text-gray-600 outline-none focus:ring-2 focus:ring-brand-light">
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="=">=</option>
              </select>
              <input type="number" placeholder="Monto..." className="flex-1 p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Actualizado el</label>
            <input type="date" className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light text-gray-600" />
          </div>

          <div className="opacity-50">
            <label className="block text-xs font-bold text-gray-500 mb-1">Proveedor (Próximamente)</label>
            <select disabled className="w-full p-2 text-sm border rounded-md bg-gray-50 cursor-not-allowed">
              <option>Seleccionar proveedor...</option>
            </select>
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 font-medium text-center bg-gray-50 py-2 rounded">
              {filtrados.length} resultados
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FORMULARIO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-brand-dark">
                {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="producto-form" onSubmit={handleGuardar} className="flex flex-col gap-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Código de Barras</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light font-mono bg-gray-50 focus:bg-white"
                        value={formData.codigoBarras}
                        onChange={e => setFormData({...formData, codigoBarras: e.target.value})}
                      />
                      {puedeEditar && productoEditando && !formData.codigoBarras && (
                        <button
                          type="button"
                          onClick={handleGenerarCodigo}
                          disabled={generandoCodigo}
                          className="px-4 py-2 border border-brand-light text-brand-dark rounded-lg hover:bg-brand-light/10 font-bold disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {generandoCodigo ? 'Generando...' : 'Generar Automático'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Precio de Costo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full p-2.5 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                        value={formData.precioCosto}
                        onChange={e => setFormData({...formData, precioCosto: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Precio de Venta *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        className="w-full p-2.5 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light font-bold text-brand-dark bg-gray-50 focus:bg-white"
                        value={formData.precioVenta}
                        onChange={e => setFormData({...formData, precioVenta: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Stock Actual</label>
                    <input
                      type="number"
                      step="1"
                      disabled={!!productoEditando}
                      className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      value={formData.stockActual}
                      onChange={e => setFormData({...formData, stockActual: e.target.value})}
                      title={productoEditando ? "El stock solo puede ajustarse por movimientos o inventario." : ""}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                      value={formData.stockMinimo}
                      onChange={e => setFormData({...formData, stockMinimo: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                    <select
                      className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white text-gray-700"
                      value={formData.categoriaId}
                      onChange={e => setFormData({...formData, categoriaId: e.target.value})}
                    >
                      <option value="">(Sin categoría)</option>
                      {categoriasLista.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Unidad de Medida</label>
                    <select
                      className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white text-gray-700"
                      value={formData.unidadMedidaId}
                      onChange={e => setFormData({...formData, unidadMedidaId: e.target.value})}
                    >
                      <option value="">(Sin unidad)</option>
                      {unidadesLista.map(uni => (
                        <option key={uni.id} value={uni.id}>{uni.nombre} {uni.abreviatura ? `(${uni.abreviatura})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                type="button" 
                onClick={cerrarModal}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                  <Package size={20} /> Ajuste Manual de Stock
                </h2>
                <p className="text-sm text-gray-500 mt-1">{productoAjuste.nombre}</p>
              </div>
              <button onClick={() => setMostrarModalAjuste(false)} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 rounded-lg p-3 mb-5 flex justify-between items-center border border-blue-100">
                <span className="text-sm font-semibold text-blue-800">Stock Actual:</span>
                <span className="text-xl font-black text-blue-900">{productoAjuste.stockActual}</span>
              </div>

              <form onSubmit={handleAjusteStock} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Ajuste</label>
                  <select
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 font-semibold"
                    value={ajusteData.tipo}
                    onChange={e => setAjusteData({...ajusteData, tipo: e.target.value})}
                  >
                    <option value="ENTRADA">ENTRADA (Sumar stock)</option>
                    <option value="SALIDA">SALIDA (Restar stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    autoFocus
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 text-lg font-bold"
                    value={ajusteData.cantidad}
                    onChange={e => setAjusteData({...ajusteData, cantidad: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Motivo / Concepto *</label>
                  <input
                    type="text"
                    required
                    placeholder={ajusteData.tipo === 'ENTRADA' ? "Ej: Ingreso mercadería, Devolución..." : "Ej: Rotura, Vencimiento, Merma..."}
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
                    value={ajusteData.motivo}
                    onChange={e => setAjusteData({...ajusteData, motivo: e.target.value})}
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setMostrarModalAjuste(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                  <button type="submit" disabled={guardandoAjuste} className="flex-1 py-3 bg-brand-dark text-white font-bold rounded-lg hover:bg-black disabled:opacity-50 shadow-md">
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
