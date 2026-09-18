import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Save, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string;
  stockActual: number;
}

const AjusteStock = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidad, setCantidad] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (busqueda.trim().length > 2 && !productoSeleccionado) {
      const delay = setTimeout(() => {
        buscarProductos();
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setProductosEncontrados([]);
    }
  }, [busqueda, productoSeleccionado]);

  const buscarProductos = async () => {
    try {
      const res = await api.get('/productos');
      const filtrados = res.data.filter((p: any) => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        (p.codigoBarras && p.codigoBarras.includes(busqueda))
      ).slice(0, 10);
      setProductosEncontrados(filtrados);
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
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <ClipboardList className="text-brand-light" size={26} /> Ajuste Manual de Stock
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Corregí el inventario de forma trazable (mermas, roturas, errores).
          </p>
        </div>
        <button 
          onClick={() => navigate('/historial-stock')}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          Ver Historial
        </button>
      </div>

      <div className="flex-1 flex gap-6 max-w-5xl mx-auto w-full">
        {/* Panel de Búsqueda */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col h-full">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
              <Search size={18} className="text-gray-400" /> 1. Buscar Producto
            </h2>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Escribí nombre o código (min 3 letras)..."
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-light outline-none ${productoSeleccionado ? 'bg-gray-100 text-gray-500 font-bold border-gray-300' : 'bg-white'}`}
                value={busqueda}
                onChange={e => {
                  if (productoSeleccionado) limpiarSeleccion();
                  setBusqueda(e.target.value);
                }}
              />
              {productoSeleccionado && (
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold text-lg"
                  onClick={limpiarSeleccion}
                >
                  &times;
                </button>
              )}
            </div>

            {!productoSeleccionado && (
              <div className="flex-1 overflow-y-auto mt-2 space-y-2">
                {productosEncontrados.map(prod => (
                  <div 
                    key={prod.id} 
                    className="p-3 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg cursor-pointer flex justify-between items-center transition-colors"
                    onClick={() => seleccionarProducto(prod)}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800">{prod.nombre}</div>
                      <div className="text-xs text-gray-400 font-mono">{prod.codigoBarras || 'S/N'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase font-bold">Stock Actual</div>
                      <div className="font-mono font-bold text-lg text-brand-dark">{prod.stockActual}</div>
                    </div>
                  </div>
                ))}
                {busqueda.length > 2 && productosEncontrados.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            )}

            {productoSeleccionado && (
              <div className="mt-6 p-6 bg-blue-50/50 rounded-lg border border-blue-100 text-center flex flex-col items-center justify-center flex-1">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <ClipboardList className="text-brand-light" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">{productoSeleccionado.nombre}</h3>
                <p className="text-gray-500 font-mono mb-4">{productoSeleccionado.codigoBarras || 'Sin código'}</p>
                <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200">
                  <span className="text-sm font-bold text-gray-400 uppercase mr-2">Stock Actual:</span>
                  <span className="text-2xl font-bold font-mono text-brand-dark">{productoSeleccionado.stockActual}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Ajuste */}
        <div className="w-1/2">
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full transition-opacity duration-300 flex flex-col ${!productoSeleccionado ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h2 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
              <Plus size={18} className="text-gray-400" /> 2. Detalles del Ajuste
            </h2>
            
            <form onSubmit={handleGuardar} className="flex flex-col gap-5 flex-1">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Ajuste *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTipo('ENTRADA')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border ${tipo === 'ENTRADA' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    >
                      <Plus size={16} /> Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('SALIDA')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border ${tipo === 'SALIDA' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    >
                      <Minus size={16} /> Egreso
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cantidad *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none font-mono text-lg text-center"
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {productoSeleccionado && cantidad && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center mt-2">
                  <span className="text-sm font-bold text-gray-500">Stock Resultante Estimado: </span>
                  <span className="text-lg font-bold font-mono text-brand-dark">
                    {tipo === 'ENTRADA' 
                      ? Number(productoSeleccionado.stockActual) + Number(cantidad) 
                      : Number(productoSeleccionado.stockActual) - Number(cantidad)
                    }
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo *</label>
                <select
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none bg-white"
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
                <label className="block text-sm font-bold text-gray-700 mb-2">Observaciones (Opcional)</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light outline-none h-24 resize-none"
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
