import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Parametros = () => {
  const [impresionTicket, setImpresionTicket] = useState('PREGUNTAR');
  const [etiquetaMostrarPrecio, setEtiquetaMostrarPrecio] = useState('false');
  
  // Parámetros Empresa
  const [empresaRazonSocial, setEmpresaRazonSocial] = useState('');
  const [empresaCuit, setEmpresaCuit] = useState('');
  const [empresaDireccion, setEmpresaDireccion] = useState('');
  const [empresaCondicionIva, setEmpresaCondicionIva] = useState('Responsable Inscripto');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarParametros();
  }, []);

  const cargarParametros = async () => {
    try {
      const [resTicket, resEtiqueta, resRS, resCuit, resDir, resIva] = await Promise.all([
        api.get('/parametros/impresionTicket'),
        api.get('/parametros/etiquetaMostrarPrecio'),
        api.get('/parametros/empresaRazonSocial'),
        api.get('/parametros/empresaCuit'),
        api.get('/parametros/empresaDireccion'),
        api.get('/parametros/empresaCondicionIva'),
      ]);
      if (resTicket.data?.valor) setImpresionTicket(resTicket.data.valor);
      if (resEtiqueta.data?.valor) setEtiquetaMostrarPrecio(resEtiqueta.data.valor);
      if (resRS.data?.valor) setEmpresaRazonSocial(resRS.data.valor);
      if (resCuit.data?.valor) setEmpresaCuit(resCuit.data.valor);
      if (resDir.data?.valor) setEmpresaDireccion(resDir.data.valor);
      if (resIva.data?.valor) setEmpresaCondicionIva(resIva.data.valor);
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
        api.put('/parametros/etiquetaMostrarPrecio', { valor: etiquetaMostrarPrecio }),
        api.put('/parametros/empresaRazonSocial', { valor: empresaRazonSocial }),
        api.put('/parametros/empresaCuit', { valor: empresaCuit }),
        api.put('/parametros/empresaDireccion', { valor: empresaDireccion }),
        api.put('/parametros/empresaCondicionIva', { valor: empresaCondicionIva })
      ]);
      toast.success('Configuraciones guardadas exitosamente');
    } catch (err) {
      toast.error('Error al guardar configuraciones');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="h-full flex items-center justify-center text-gray-500 dark:text-slate-400">Cargando parámetros...</div>;
  }

  return (
    <div className="flex flex-col p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="text-brand-light" size={32} />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Parámetros del Sistema</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 max-w-2xl overflow-hidden transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
          <h2 className="text-lg font-bold text-gray-700 dark:text-slate-200">Configuración General</h2>
        </div>
        
        <form onSubmit={handleGuardar} className="p-6 flex flex-col gap-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Impresión de ticket al cobrar
            </label>
            <select
              className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
              value={impresionTicket}
              onChange={e => setImpresionTicket(e.target.value)}
            >
              <option value="SIEMPRE">Siempre (Imprime automáticamente sin preguntar)</option>
              <option value="PREGUNTAR">Preguntar (Muestra un cuadro de diálogo tras cada venta)</option>
              <option value="NUNCA">Nunca (No imprime tickets)</option>
            </select>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Define el comportamiento del sistema justo después de registrar un cobro exitoso en la pantalla de Ventas.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Mostrar precio en etiquetas
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={etiquetaMostrarPrecio === 'true'}
                onChange={e => setEtiquetaMostrarPrecio(e.target.checked ? 'true' : 'false')}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-light/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-dark"></div>
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                {etiquetaMostrarPrecio === 'true' ? 'Sí, mostrar precio' : 'No, solo nombre y código de barras'}
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Activa o desactiva la impresión del precio de venta en las etiquetas de los productos.
            </p>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 max-w-2xl overflow-hidden mt-6 transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
          <h2 className="text-lg font-bold text-gray-700 dark:text-slate-200">Datos de la Empresa / Comercio</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Estos datos aparecerán en los encabezados de los Presupuestos y Remitos impresos en A4.</p>
        </div>
        
        <form onSubmit={handleGuardar} className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Razón Social o Nombre</label>
              <input
                type="text"
                className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                value={empresaRazonSocial}
                onChange={e => setEmpresaRazonSocial(e.target.value)}
                placeholder="Ej. Mi Comercio S.A."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">CUIT / Documento</label>
              <input
                type="text"
                className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                value={empresaCuit}
                onChange={e => setEmpresaCuit(e.target.value)}
                placeholder="Ej. 30-12345678-9"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Dirección del Comercio</label>
              <input
                type="text"
                className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                value={empresaDireccion}
                onChange={e => setEmpresaDireccion(e.target.value)}
                placeholder="Ej. Av. Siempre Viva 123, Ciudad"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Condición IVA</label>
              <select
                className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                value={empresaCondicionIva}
                onChange={e => setEmpresaCondicionIva(e.target.value)}
              >
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributo">Monotributo</option>
                <option value="Exento">Exento</option>
                <option value="Consumidor Final">Consumidor Final</option>
              </select>
            </div>
            
            <div className="col-span-2 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-bold">Logotipo:</span> Para que el logo de tu empresa aparezca en los comprobantes, asegúrate de guardar un archivo de imagen llamado <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Logoempresa.png</code> en la carpeta pública del sistema.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700 mt-2 transition-colors">
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
