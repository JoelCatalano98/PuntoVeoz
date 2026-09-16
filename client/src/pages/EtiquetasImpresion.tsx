import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, Printer, X, Tag, Search, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JsBarcode from 'jsbarcode';

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string;
  precioVenta: number;
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

  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    cargarFormato();
    cargarProductos();
  }, []);

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
    } catch (err) {
      // Ignorar error, usamos default si no existe (404)
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await api.get('/productos');
      // Solo productos con código de barras
      setProductos(res.data.filter((p: any) => p.codigoBarras));
    } catch (err) {
      toast.error('Error al cargar productos');
    }
  };

  const productosFiltrados = busqueda
    ? productos.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        p.codigoBarras.includes(busqueda)
      )
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
    <div className="h-full flex flex-col p-6 bg-gray-50 print:p-0 print:bg-white print:h-auto">
      
      {/* HEADER - OCULTO EN IMPRESION */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Tag className="text-brand-light" size={32} />
          Impresión de Etiquetas
        </h1>
        {usuario?.rol !== 'CAJERO' && (
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 shadow-sm"
          >
            <Settings size={18} /> Configurar Formato
          </button>
        )}
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-start gap-3 print:hidden">
        <AlertCircle className="shrink-0 mt-0.5" size={20} />
        <div className="text-sm">
          <p className="font-bold mb-1">Tip para imprimir</p>
          <p>Para asegurar que las medidas salgan exactas, recordá configurar en el navegador <strong>Escala: Predeterminada (100%)</strong> y <strong>Márgenes: Ninguno</strong> al momento de imprimir.</p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL - OCULTO EN IMPRESION */}
      <div className="flex flex-1 gap-6 overflow-hidden print:hidden">
        
        {/* PANEL IZQUIERDO: Buscador */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-700 mb-3">Buscar Producto</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Nombre o código de barras..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {busqueda.length > 0 ? (
              productosFiltrados.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {productosFiltrados.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100">
                      <div className="overflow-hidden">
                        <div className="font-bold text-gray-800 truncate" title={prod.nombre}>{prod.nombre}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">{prod.codigoBarras}</div>
                      </div>
                      <button 
                        onClick={() => agregarACola(prod)}
                        className="ml-2 shrink-0 p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition-colors"
                        title="Agregar a la cola"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 p-8 text-sm">No se encontraron productos con código de barras que coincidan.</p>
              )
            ) : (
              <div className="text-center text-gray-400 p-8 flex flex-col items-center gap-3">
                <Search size={32} className="opacity-20" />
                <p className="text-sm">Buscá un producto para agregarlo a la cola de impresión.</p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Cola de Impresión */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">Cola de Impresión</h2>
            <span className="bg-brand-light text-brand-dark px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              {aplanarCola().length} etiquetas totales
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cola.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <Printer size={48} className="opacity-20" />
                <p>La cola está vacía.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Producto</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center w-24">Cantidad</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cola.map(item => (
                    <tr key={item.producto.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{item.producto.nombre}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{item.producto.codigoBarras}</div>
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={e => actualizarCantidad(item.producto.id, e.target.value)}
                          className="w-16 p-2 text-center border rounded focus:outline-none focus:border-brand-light"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => eliminarDeCola(item.producto.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

          <div className="p-4 border-t border-gray-200 bg-gray-50">
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
              <div className="text-xs font-extrabold text-right mt-0.5">${Number(prod.precioVenta).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Configuración */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex overflow-hidden max-h-[90vh]">
            
            {/* Formulario */}
            <div className="w-1/2 flex flex-col border-r border-gray-100">
              <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">Tamaño de Etiqueta (mm)</h2>
                <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-800">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={guardarFormato} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ancho Etiqueta</label>
                    <input type="number" required min="10" className="w-full p-2 border rounded bg-gray-50" value={formato.anchoMm} onChange={e => handleFormatoChange('anchoMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alto Etiqueta</label>
                    <input type="number" required min="10" className="w-full p-2 border rounded bg-gray-50" value={formato.altoMm} onChange={e => handleFormatoChange('altoMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Columnas por hoja</label>
                    <input type="number" required min="1" className="w-full p-2 border rounded bg-gray-50" value={formato.columnas} onChange={e => handleFormatoChange('columnas', e.target.value)} />
                  </div>
                  <div className="col-span-2 border-t border-gray-100 my-2 pt-4">
                    <h3 className="font-bold text-gray-700 mb-3">Márgenes de Hoja</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Superior</label>
                    <input type="number" required min="0" className="w-full p-2 border rounded bg-gray-50" value={formato.margenSuperiorMm} onChange={e => handleFormatoChange('margenSuperiorMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Izquierdo</label>
                    <input type="number" required min="0" className="w-full p-2 border rounded bg-gray-50" value={formato.margenIzquierdoMm} onChange={e => handleFormatoChange('margenIzquierdoMm', e.target.value)} />
                  </div>
                  <div className="col-span-2 border-t border-gray-100 my-2 pt-4">
                    <h3 className="font-bold text-gray-700 mb-3">Espaciado entre etiquetas</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Espacio Horizontal</label>
                    <input type="number" required min="0" className="w-full p-2 border rounded bg-gray-50" value={formato.espacioHorizontalMm} onChange={e => handleFormatoChange('espacioHorizontalMm', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Espacio Vertical</label>
                    <input type="number" required min="0" className="w-full p-2 border rounded bg-gray-50" value={formato.espacioVerticalMm} onChange={e => handleFormatoChange('espacioVerticalMm', e.target.value)} />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                  <button type="submit" disabled={guardando} className="flex-1 py-3 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-400 disabled:opacity-50">
                    {guardando ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </form>
            </div>

            {/* Vista Previa a escala aproximada */}
            <div className="w-1/2 bg-gray-100 p-6 flex flex-col">
              <h3 className="font-bold text-gray-500 mb-4 uppercase tracking-wider text-sm">Vista Previa Aproximada</h3>
              <div className="flex-1 bg-gray-200 rounded flex items-center justify-center p-8 overflow-hidden relative border border-dashed border-gray-300">
                {/* Simulación de la etiqueta, asumiendo 1mm = 4px para la vista previa */}
                <div 
                  className="bg-white border border-gray-300 shadow-sm flex flex-col justify-between p-2"
                  style={{
                    width: `${formato.anchoMm * 4}px`,
                    height: `${formato.altoMm * 4}px`
                  }}
                >
                  <div className="text-[10px] font-bold truncate leading-tight text-center">Producto de Ejemplo Largo</div>
                  <div className="flex-1 flex items-center justify-center my-1 overflow-hidden">
                    <svg id="barcode-preview" className="w-full h-full object-contain"></svg>
                  </div>
                  <div className="text-xs font-extrabold text-right mt-0.5">$1.500,00</div>
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
