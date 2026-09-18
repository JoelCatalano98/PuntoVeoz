import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Parametros = () => {
  const [impresionTicket, setImpresionTicket] = useState('PREGUNTAR');
  const [etiquetaMostrarPrecio, setEtiquetaMostrarPrecio] = useState('false');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarParametros();
  }, []);

  const cargarParametros = async () => {
    try {
      const [resTicket, resEtiqueta] = await Promise.all([
        api.get('/parametros/impresionTicket'),
        api.get('/parametros/etiquetaMostrarPrecio')
      ]);
      if (resTicket.data?.valor) {
        setImpresionTicket(resTicket.data.valor);
      }
      if (resEtiqueta.data?.valor) {
        setEtiquetaMostrarPrecio(resEtiqueta.data.valor);
      }
    } catch (err) {
      toast.error('Error al cargar configuraciones');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      await Promise.all([
        api.put('/parametros/impresionTicket', { valor: impresionTicket }),
        api.put('/parametros/etiquetaMostrarPrecio', { valor: etiquetaMostrarPrecio })
      ]);
      toast.success('Configuraciones guardadas exitosamente');
    } catch (err) {
      toast.error('Error al guardar configuraciones');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="h-full flex items-center justify-center text-gray-500">Cargando parámetros...</div>;
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="text-brand-light" size={32} />
        <h1 className="text-3xl font-bold text-gray-800">Parámetros del Sistema</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-700">Configuración General</h2>
        </div>
        
        <form onSubmit={handleGuardar} className="p-6 flex flex-col gap-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Impresión de ticket al cobrar
            </label>
            <select
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50"
              value={impresionTicket}
              onChange={e => setImpresionTicket(e.target.value)}
            >
              <option value="SIEMPRE">Siempre (Imprime automáticamente sin preguntar)</option>
              <option value="PREGUNTAR">Preguntar (Muestra un cuadro de diálogo tras cada venta)</option>
              <option value="NUNCA">Nunca (No imprime tickets)</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Define el comportamiento del sistema justo después de registrar un cobro exitoso en la pantalla de Ventas.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mostrar precio en etiquetas
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={etiquetaMostrarPrecio === 'true'}
                onChange={e => setEtiquetaMostrarPrecio(e.target.checked ? 'true' : 'false')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-light/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-dark"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {etiquetaMostrarPrecio === 'true' ? 'Sí, mostrar precio' : 'No, solo nombre y código de barras'}
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500">
              Activa o desactiva la impresión del precio de venta en las etiquetas de los productos.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={guardando}
              className="bg-brand-dark text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Parametros;
