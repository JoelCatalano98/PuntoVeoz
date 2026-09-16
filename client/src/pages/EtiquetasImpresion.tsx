import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, Printer, X, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JsBarcode from 'jsbarcode';

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

  useEffect(() => {
    cargarFormato();
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
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
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

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Pantalla de selección de productos en construcción...</p>
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
