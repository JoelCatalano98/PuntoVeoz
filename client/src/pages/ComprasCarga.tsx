import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, Trash2, Building2, Calendar, FileText, Printer, CheckCircle } from 'lucide-react';
import { FacturaImpresion } from '../components/FacturaImpresion';

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string;
  precioCosto: number;
}

interface DetalleCompra {
  productoId: number;
  nombre: string;
  codigoBarras: string;
  cantidad: number;
  precioCosto: number;
  subtotal: number;
}

interface Proveedor {
  id: number;
  razonSocial: string;
}

const ComprasCarga = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(true);

  // Nuevo Producto Rápido
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);

  // Cabecera de Factura
  const [proveedorId, setProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState('CUENTA_CORRIENTE');
  const [actualizarCosto, setActualizarCosto] = useState(true);

  // Estado de Caja (para cuando metodoPago === EFECTIVO_CAJA)
  const [cajaAbiertaId, setCajaAbiertaId] = useState<number | null>(null);

  // Buscador y Carrito
  const [busqueda, setBusqueda] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [detalles, setDetalles] = useState<DetalleCompra[]>([]);
  
  const [guardando, setGuardando] = useState(false);
  const [compraExitosa, setCompraExitosa] = useState<any>(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [resProv, resCaja, resCat] = await Promise.all([
        api.get('/proveedores'),
        api.get('/caja/estado'),
        api.get('/categorias')
      ]);
      setProveedores(resProv.data);
      setCategorias(resCat.data);
      if (resCaja.data.abierta) {
        setCajaAbiertaId(resCaja.data.apertura.cajaId);
      }
    } catch (err) {
      toast.error('Error al inicializar la pantalla de compras');
    } finally {
      setCargandoProveedores(false);
    }
  };

  useEffect(() => {
    if (busqueda.trim().length > 2) {
      const delay = setTimeout(() => {
        buscarProductos();
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setProductosEncontrados([]);
    }
  }, [busqueda]);

  const buscarProductos = async () => {
    try {
      // Usamos el endpoint de productos que ya soporta búsqueda en memoria o backend
      // Si tenemos muchos productos, lo ideal es buscar por un query.
      const res = await api.get('/productos'); 
      const filtrados = res.data.filter((p: any) => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        (p.codigoBarras && p.codigoBarras.includes(busqueda))
      ).slice(0, 10);
      setProductosEncontrados(filtrados);
    } catch (err) {
      // silent fail o mostrar algo
    }
  };

  const agregarAlCarrito = (prod: Producto) => {
    const existe = detalles.find(d => d.productoId === prod.id);
    if (existe) {
      toast.error('Este producto ya está en el detalle. Editá la cantidad directamente en la tabla.');
      return;
    }

    const costoNum = parseFloat(prod.precioCosto?.toString() || '0');
    setDetalles([
      ...detalles,
      {
        productoId: prod.id,
        nombre: prod.nombre,
        codigoBarras: prod.codigoBarras,
        cantidad: 1,
        precioCosto: costoNum,
        subtotal: costoNum
      }
    ]);
    setBusqueda('');
    setProductosEncontrados([]);
  };

  const actualizarDetalle = (index: number, campo: 'cantidad' | 'precioCosto', valor: number) => {
    if (isNaN(valor) || valor < 0) return;
    
    setDetalles(prev => {
      const nuevos = [...prev];
      nuevos[index][campo] = valor;
      nuevos[index].subtotal = nuevos[index].cantidad * nuevos[index].precioCosto;
      return nuevos;
    });
  };

  const eliminarDetalle = (index: number) => {
    setDetalles(prev => prev.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    const total = detalles.reduce((acc, item) => {
      // Forzamos a número para evitar concatenación de strings
      const cantidad = parseFloat(item.cantidad?.toString() || "0");
      const precio = parseFloat(item.precioCosto?.toString() || "0");
      return acc + (cantidad * precio);
    }, 0);
    
    return total;
  };

  const handleGuardar = async () => {
    if (!proveedorId) return toast.error('Debe seleccionar un proveedor');
    if (detalles.length === 0) return toast.error('Debe agregar al menos un producto a la factura');
    
    if (metodoPago === 'EFECTIVO_CAJA' && !cajaAbiertaId) {
      return toast.error('No tienes un turno de caja abierto para registrar un egreso en efectivo.');
    }

    setGuardando(true);
    const payload = {
      proveedorId: Number(proveedorId),
      numeroFactura,
      fechaEmision,
      metodoPago,
      cajaId: cajaAbiertaId,
      total: calcularTotal(),
      actualizarCosto,
      detalles: detalles.map(d => ({
        productoId: d.productoId,
        cantidad: d.cantidad,
        precioCosto: d.precioCosto,
        subtotal: d.subtotal
      }))
    };

    try {
      const res = await api.post('/compras', payload);
      toast.success('Compra registrada con éxito y stock actualizado');
      setCompraExitosa(res.data);
      // Imprimir automáticamente
      setTimeout(() => {
        window.print();
        limpiarFormulario();
      }, 500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar la compra');
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormulario = () => {
    setProveedorId('');
    setNumeroFactura('');
    setFechaEmision(new Date().toISOString().split('T')[0]);
    setMetodoPago('CUENTA_CORRIENTE');
    setDetalles([]);
    setCompraExitosa(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 print:p-0 print:bg-white transition-colors duration-200">
      
      {/* ===== CONTENIDO VISIBLE (OCULTO AL IMPRIMIR) ===== */}
      <div className="print:hidden h-full flex flex-col">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark dark:text-slate-200 flex items-center gap-2">
              <CheckCircle className="text-brand-light" size={26} /> Ingreso de Mercadería
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Carga de facturas de compra y actualización de stock</p>
          </div>
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* PANEL IZQUIERDO: Cabecera */}
          <div className="w-1/3 flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 transition-colors duration-200">
              <h2 className="font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2 transition-colors">
                <FileText size={18} className="text-gray-400" /> Datos del Comprobante
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Proveedor *</label>
                  <select
                    className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors"
                    value={proveedorId}
                    onChange={e => setProveedorId(e.target.value)}
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.razonSocial}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nº Factura / Remito</label>
                    <input
                      type="text"
                      placeholder="Ej: 0001-00004567"
                      className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors"
                      value={numeroFactura}
                      onChange={e => setNumeroFactura(e.target.value)}
                    />
                  </div>
                  <div className="w-2/5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                    <input
                      type="date"
                      className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors"
                      value={fechaEmision}
                      onChange={e => setFechaEmision(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Método de Pago</label>
                  <select
                    className="w-full p-2 border dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-brand-light outline-none bg-blue-50/50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={metodoPago}
                    onChange={e => setMetodoPago(e.target.value)}
                  >
                    <option value="CUENTA_CORRIENTE">Cuenta Corriente (Pendiente)</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="EFECTIVO_CAJA">Efectivo (Extraer de Caja Actual)</option>
                  </select>
                  {metodoPago === 'EFECTIVO_CAJA' && !cajaAbiertaId && (
                    <p className="text-red-500 text-xs mt-1 font-bold">⚠️ No hay caja abierta. No podrás guardar.</p>
                  )}
                </div>

                <div className="pt-2 border-t dark:border-slate-700 mt-4 transition-colors">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-brand-light rounded border-gray-300 focus:ring-brand-light"
                      checked={actualizarCosto}
                      onChange={e => setActualizarCosto(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Actualizar precios de costo en el catálogo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 flex-1 flex flex-col min-h-0 transition-colors duration-200">
               <h2 className="font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2 transition-colors">
                <Search size={18} className="text-gray-400" /> Buscar Producto
              </h2>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Escribí para buscar (min 3 letras)..."
                  className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-1 focus:ring-brand-light outline-none flex-1 transition-colors"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setMostrarModalProducto(true)}
                  className="bg-brand-light text-white px-3 py-2 rounded-lg hover:bg-blue-600 font-bold whitespace-nowrap text-sm"
                >
                  + Nuevo
                </button>
              </div>
              <div className="flex-1 overflow-y-auto mt-2 space-y-1">
                {productosEncontrados.map(prod => (
                  <div 
                    key={prod.id} 
                    className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 rounded-lg cursor-pointer flex justify-between items-center transition-colors"
                    onClick={() => agregarAlCarrito(prod)}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{prod.nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 font-mono">{prod.codigoBarras || 'S/N'}</div>
                    </div>
                    <button className="text-brand-light bg-brand-light/10 dark:bg-brand-light/20 p-1.5 rounded hover:bg-brand-light hover:text-white transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
                {busqueda.length > 2 && productosEncontrados.length === 0 && (
                  <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-4">No se encontraron productos.</div>
                )}
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: Detalle de la Factura (Carrito Invertido) */}
          <div className="w-2/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors duration-200">
             <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-b dark:border-slate-700 flex justify-between items-center transition-colors">
              <h2 className="font-bold text-gray-700 dark:text-slate-200">Detalle de Ingreso</h2>
              <span className="text-sm font-bold text-brand-dark dark:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border dark:border-slate-600 shadow-sm transition-colors">
                Total: ${Number(calcularTotal()).toFixed(2)}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white dark:bg-slate-800 sticky top-0 border-b dark:border-slate-700 z-10 shadow-sm transition-colors">
                  <tr>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Producto</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-24 text-center">Cant.</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-32 text-center">Costo Unit.</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-28 text-right">Subtotal</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle size={40} className="opacity-20" />
                          <p>Buscá y seleccioná productos para agregarlos al detalle.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    detalles.map((det, index) => (
                      <tr key={det.productoId} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{det.nombre}</div>
                          <div className="text-xs text-gray-400 dark:text-slate-500 font-mono">{det.codigoBarras || '-'}</div>
                        </td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            min="1"
                            className="w-16 p-1.5 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded text-center text-sm focus:ring-1 focus:ring-brand-light outline-none transition-colors"
                            value={det.cantidad || ''}
                            onChange={e => actualizarDetalle(index, 'cantidad', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-sm">$</span>
                            <input 
                              type="number" 
                              min="0" step="0.01"
                              className="w-full pl-6 p-1.5 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded text-sm focus:ring-1 focus:ring-brand-light outline-none transition-colors"
                              value={det.precioCosto || ''}
                              onChange={e => actualizarDetalle(index, 'precioCosto', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-700 dark:text-slate-200">
                          ${Number(det.subtotal).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => eliminarDetalle(index)}
                            className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end transition-colors">
               <button
                onClick={handleGuardar}
                disabled={guardando || detalles.length === 0}
                className="bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
              >
                <Printer size={20} />
                {guardando ? 'Guardando...' : 'Guardar y Generar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== COMPROBANTE DE IMPRESION (SOLO VISIBLE EN @media print) ===== */}
      <div className="hidden print:block text-black bg-white p-8 max-w-4xl mx-auto">
        {compraExitosa || detalles.length > 0 ? (
          <>
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-widest">Ingreso de Mercadería</h1>
                <p className="text-sm mt-1 text-gray-600">Comprobante de Control Interno</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl">Nº {compraExitosa?.id ? String(compraExitosa.id).padStart(6, '0') : 'BORRADOR'}</p>
                <p className="text-sm mt-1">Fecha: {fechaEmision.split('-').reverse().join('/')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="border border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold uppercase text-xs text-gray-500 mb-2">Datos del Proveedor</h3>
                <p className="font-bold text-lg">{proveedores.find(p => p.id === Number(proveedorId))?.razonSocial || 'Consumidor Final'}</p>
                <p className="text-sm mt-1">Ref. Factura: {numeroFactura || 'S/N'}</p>
              </div>
              <div className="border border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold uppercase text-xs text-gray-500 mb-2">Condiciones de Pago</h3>
                <p className="font-bold text-lg">{metodoPago.replace('_', ' ')}</p>
                <p className="text-sm mt-1">Usuario: Ingreso automatizado</p>
              </div>
            </div>

            <table className="w-full text-left mb-8 border-collapse">
              <thead>
                <tr className="border-y-2 border-black">
                  <th className="py-2 px-2 font-bold uppercase text-sm">Cód.</th>
                  <th className="py-2 px-2 font-bold uppercase text-sm">Descripción</th>
                  <th className="py-2 px-2 font-bold uppercase text-sm text-center">Cant.</th>
                  <th className="py-2 px-2 font-bold uppercase text-sm text-right">P.U.</th>
                  <th className="py-2 px-2 font-bold uppercase text-sm text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detalles.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2 px-2 font-mono text-sm">{d.codigoBarras || '-'}</td>
                    <td className="py-2 px-2 text-sm">{d.nombre}</td>
                    <td className="py-2 px-2 text-center text-sm font-bold">{d.cantidad}</td>
                    <td className="py-2 px-2 text-right font-mono text-sm">${Number(d.precioCosto).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-sm font-bold">${Number(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black">
                  <td colSpan={3} className="py-4 text-right font-bold uppercase">Total General:</td>
                  <td colSpan={2} className="py-4 px-2 text-right font-bold text-2xl font-mono">${Number(calcularTotal()).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between text-sm text-gray-500 text-center">
              <div className="w-48 border-t border-gray-400 pt-2">Firma Recibe</div>
              <div className="w-48 border-t border-gray-400 pt-2">Firma Entrega</div>
            </div>
          </>
        ) : (
          <p>No hay datos para imprimir.</p>
        )}
      </div>
      
      {/* ===== MODAL DE NUEVO PRODUCTO RÁPIDO ===== */}
      {mostrarModalProducto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col transition-colors duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-xl font-bold text-brand-dark dark:text-slate-200">Alta Rápida de Producto</h3>
              <button onClick={() => setMostrarModalProducto(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              try {
                const res = await api.post('/productos', {
                  nombre: formData.get('nombre'),
                  codigoBarras: formData.get('codigoBarras') || null,
                  precioCosto: parseFloat(formData.get('precioCosto') as string),
                  precioVenta: parseFloat(formData.get('precioVenta') as string),
                  stockActual: 0,
                  categoriaId: Number(formData.get('categoriaId')) || null,
                });

                toast.success('Producto creado exitosamente');
                
                // Lo agregamos automáticamente al carrito
                const nuevoProducto = res.data;
                agregarAlCarrito(nuevoProducto);
                
                setMostrarModalProducto(false);
              } catch (error: any) {
                toast.error(error.response?.data?.error || 'Error al crear el producto');
              }
            }}>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Nombre *</label>
                  <input name="nombre" placeholder="Ej. Mayonesa Natura" required className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Código de Barras</label>
                  <input name="codigoBarras" placeholder="Opcional" className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors" />
                </div>
                <div className="flex gap-4">
                   <div className="flex-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Costo *</label>
                     <input name="precioCosto" type="number" step="0.01" min="0" placeholder="$0.00" required className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Venta *</label>
                     <input name="precioVenta" type="number" step="0.01" min="0" placeholder="$0.00" required className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors" />
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Categoría</label>
                  <select name="categoriaId" className="w-full p-2 border dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-light outline-none transition-colors">
                    <option value="">Sin Categoría</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end gap-3 transition-colors">
                <button type="button" onClick={() => setMostrarModalProducto(false)} className="px-4 py-2 text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-dark text-white font-bold rounded-lg hover:bg-blue-900 transition-colors">Guardar y Usar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPONENTE DE IMPRESIÓN (Solo visible al imprimir) */}
      {compraExitosa && (
        <FacturaImpresion compra={compraExitosa} />
      )}
    </div>
  );
};

export default ComprasCarga;
