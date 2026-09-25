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

  // Parámetros de Impresión por Comprobante
  const [impresionFacturaElectronica, setImpresionFacturaElectronica] = useState('A4');
  const [impresionPresupuesto, setImpresionPresupuesto] = useState('TICKET');
  const [impresionRemito, setImpresionRemito] = useState('TICKET');
  const [impresionNotaCredito, setImpresionNotaCredito] = useState('A4');

  // Parámetros de Impresora Térmica
  const [impresoraTicketAncho, setImpresoraTicketAncho] = useState('80mm');
  const [impresoraTicketMargen, setImpresoraTicketMargen] = useState('2');


  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarParametros();
  }, []);

  const cargarParametros = async () => {
    try {
      const [
        resTicket, resEtiqueta, resRS, resCuit, resDir, resIva,
        resFE, resPresup, resRemito, resNC, resAncho, resMargen
      ] = await Promise.all([
        api.get('/parametros/impresionTicket'),
        api.get('/parametros/etiquetaMostrarPrecio'),
        api.get('/parametros/empresaRazonSocial'),
        api.get('/parametros/empresaCuit'),
        api.get('/parametros/empresaDireccion'),
        api.get('/parametros/empresaCondicionIva'),
        api.get('/parametros/impresionFacturaElectronica'),
        api.get('/parametros/impresionPresupuesto'),
        api.get('/parametros/impresionRemito'),
        api.get('/parametros/impresionNotaCredito'),
        api.get('/parametros/impresoraTicketAncho'),
        api.get('/parametros/impresoraTicketMargen')
      ]);
      if (resTicket.data?.valor) setImpresionTicket(resTicket.data.valor);
      if (resEtiqueta.data?.valor) setEtiquetaMostrarPrecio(resEtiqueta.data.valor);
      if (resRS.data?.valor) setEmpresaRazonSocial(resRS.data.valor);
      if (resCuit.data?.valor) setEmpresaCuit(resCuit.data.valor);
      if (resDir.data?.valor) setEmpresaDireccion(resDir.data.valor);
      if (resIva.data?.valor) setEmpresaCondicionIva(resIva.data.valor);
      
      if (resFE.data?.valor) setImpresionFacturaElectronica(resFE.data.valor);
      if (resPresup.data?.valor) setImpresionPresupuesto(resPresup.data.valor);
      if (resRemito.data?.valor) setImpresionRemito(resRemito.data.valor);
      if (resNC.data?.valor) setImpresionNotaCredito(resNC.data.valor);
      
      if (resAncho.data?.valor) setImpresoraTicketAncho(resAncho.data.valor);
      if (resMargen.data?.valor) setImpresoraTicketMargen(resMargen.data.valor);
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
        api.put('/parametros/empresaCondicionIva', { valor: empresaCondicionIva }),
        api.put('/parametros/impresionFacturaElectronica', { valor: impresionFacturaElectronica }),
        api.put('/parametros/impresionPresupuesto', { valor: impresionPresupuesto }),
        api.put('/parametros/impresionRemito', { valor: impresionRemito }),
        api.put('/parametros/impresionNotaCredito', { valor: impresionNotaCredito }),
        api.put('/parametros/impresoraTicketAncho', { valor: impresoraTicketAncho }),
        api.put('/parametros/impresoraTicketMargen', { valor: impresoraTicketMargen })
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

      <form onSubmit={handleGuardar} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMNA IZQUIERDA: Configuraciones Operativas */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
              <h2 className="text-lg font-bold text-gray-700 dark:text-slate-200">Configuración General</h2>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
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
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
              <h2 className="text-lg font-bold text-gray-700 dark:text-slate-200">Configuración de Impresora de Ticket</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Dimensiones físicas para cuando se imprime en modo Ticket.</p>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                  Ancho del papel
                </label>
                <select
                  className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                  value={impresoraTicketAncho}
                  onChange={e => setImpresoraTicketAncho(e.target.value)}
                >
                  <option value="58mm">58mm</option>
                  <option value="80mm">80mm</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                  Margen interno (padding) en milímetros
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                  value={impresoraTicketMargen}
                  onChange={e => setImpresoraTicketMargen(e.target.value)}
                  placeholder="Ej: 2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Empresa y Comprobantes */}
        <div className="flex flex-col gap-6">
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
              <h2 className="text-lg font-bold text-gray-700 dark:text-slate-200">Formato de Impresión por Comprobante</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Define si cada comprobante se emite como Ticket térmico o en tamaño A4.</p>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Factura Electrónica (con CAE)
                  </label>
                  <select
                    className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={impresionFacturaElectronica}
                    onChange={e => setImpresionFacturaElectronica(e.target.value)}
                  >
                    <option value="A4">A4</option>
                    <option value="TICKET">Ticket</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Nota de Crédito
                  </label>
                  <select
                    className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={impresionNotaCredito}
                    onChange={e => setImpresionNotaCredito(e.target.value)}
                  >
                    <option value="A4">A4</option>
                    <option value="TICKET">Ticket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Presupuesto
                  </label>
                  <select
                    className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={impresionPresupuesto}
                    onChange={e => setImpresionPresupuesto(e.target.value)}
                  >
                    <option value="A4">A4</option>
                    <option value="TICKET">Ticket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Remito
                  </label>
                  <select
                    className="w-full p-2 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={impresionRemito}
                    onChange={e => setImpresionRemito(e.target.value)}
                  >
                    <option value="A4">A4</option>
                    <option value="TICKET">Ticket</option>
                  </select>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-slate-400">
                <b>Nota:</b> El ticket no fiscal / interno (venta diaria) siempre se imprime en modo Ticket, por lo que no requiere configuración en esta sección.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
              <h2 className="text-lg font-bold text-gray-700 dark:text-slate-200">Datos de la Empresa / Comercio</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Estos datos aparecerán en los encabezados de los comprobantes.</p>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
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
            </div>
          </div>
        </div>
        
        {/* BOTON GUARDAR FLOTANTE O AL FINAL */}
        <div className="col-span-1 lg:col-span-2 flex justify-end pt-4 mt-2">
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
  );
};

export default Parametros;
