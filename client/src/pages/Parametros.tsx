import React, { useState, useEffect } from 'react';
import { Settings, Save, Server, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

  // Parámetros ARCA
  const [arcaCuit, setArcaCuit] = useState('');
  const [arcaPtoVta, setArcaPtoVta] = useState('');
  const [arcaModo, setArcaModo] = useState('homologacion');
  
  // Nuevos estados para certificados
  const [certString, setCertString] = useState('');
  const [keyString, setKeyString] = useState('');
  const [certCargado, setCertCargado] = useState(false);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [guardandoArca, setGuardandoArca] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [testeandoArca, setTesteandoArca] = useState(false);
  const [generandoCsr, setGenerandoCsr] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { usuario } = useAuth();

  useEffect(() => {
    cargarParametros();
  }, []);

  const cargarParametros = async () => {
    try {
      const [resTicket, resEtiqueta, resRS, resCuit, resDir, resIva, resArca] = await Promise.all([
        api.get('/parametros/impresionTicket'),
        api.get('/parametros/etiquetaMostrarPrecio'),
        api.get('/parametros/empresaRazonSocial'),
        api.get('/parametros/empresaCuit'),
        api.get('/parametros/empresaDireccion'),
        api.get('/parametros/empresaCondicionIva'),
        api.get('/comercio/arca-config').catch(() => ({ data: null }))
      ]);
      if (resTicket.data?.valor) setImpresionTicket(resTicket.data.valor);
      if (resEtiqueta.data?.valor) setEtiquetaMostrarPrecio(resEtiqueta.data.valor);
      if (resRS.data?.valor) setEmpresaRazonSocial(resRS.data.valor);
      if (resCuit.data?.valor) setEmpresaCuit(resCuit.data.valor);
      if (resDir.data?.valor) setEmpresaDireccion(resDir.data.valor);
      if (resIva.data?.valor) setEmpresaCondicionIva(resIva.data.valor);
      
      if (resArca?.data) {
        setArcaCuit(resArca.data.arcaCuit || '');
        setArcaPtoVta(resArca.data.arcaPtoVta ? String(resArca.data.arcaPtoVta) : '');
        setArcaModo(resArca.data.arcaModo || 'homologacion');
        setCertCargado(resArca.data.certCargado || false);
        setUploadedAt(resArca.data.uploadedAt || null);
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

  const handleGuardarArca = async () => {
    setGuardandoArca(true);
    try {
      const res = await api.post('/comercio/arca-config', {
        arcaCuit,
        ptoVta: arcaPtoVta ? Number(arcaPtoVta) : null,
        modo: arcaModo,
        cuit: arcaCuit,
        cert: certString,
        key: keyString
      });
      toast.success('Configuración fiscal guardada exitosamente');
      setCertCargado(res.data.certCargado);
      setUploadedAt(res.data.uploadedAt);
      setCertString('');
      setKeyString('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar configuración fiscal');
    } finally {
      setGuardandoArca(false);
    }
  };

  const handleTestArca = async () => {
    setTesteandoArca(true);
    try {
      const res = await api.get('/ventas/test-arca');
      if (res.data.success) {
        toast.success(`Conexión exitosa. Último comprobante: ${res.data.ultimoComprobante}`, {
          duration: 6000,
          style: { border: '1px solid green', padding: '16px', fontWeight: 'bold' }
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al conectar con ARCA', {
        duration: 8000,
        style: { border: '1px solid red', padding: '16px', fontWeight: 'bold' }
      });
    } finally {
      setTesteandoArca(false);
    }
  };

  const confirmarGenerarCSR = () => {
    setShowConfirmModal(true);
  };

  const handleGenerarCSR = async () => {
    setShowConfirmModal(false);
    setGenerandoCsr(true);
    try {
      const res = await api.post('/parametros/generar-csr');
      const { privateKey, csr, savedPath } = res.data;
      
      const blobKey = new Blob([privateKey], { type: 'text/plain' });
      const urlKey = window.URL.createObjectURL(blobKey);
      const aKey = document.createElement('a');
      aKey.href = urlKey;
      aKey.download = 'arca.key';
      aKey.click();
      window.URL.revokeObjectURL(urlKey);

      const blobCsr = new Blob([csr], { type: 'text/plain' });
      const urlCsr = window.URL.createObjectURL(blobCsr);
      const aCsr = document.createElement('a');
      aCsr.href = urlCsr;
      aCsr.download = 'arca.csr';
      aCsr.click();
      window.URL.revokeObjectURL(urlCsr);

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white dark:bg-slate-800 shadow-xl rounded-lg pointer-events-auto flex border border-gray-200 dark:border-slate-700 transition-colors duration-200`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  ✅ ¡Archivos generados y descargados!
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                  También se guardaron en el servidor en la ruta:
                </p>
                <code className="block mt-2 bg-gray-100 dark:bg-slate-900 p-2 rounded text-xs break-all text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
                  {savedPath}
                </code>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al generar credenciales ARCA');
    } finally {
      setGenerandoCsr(false);
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

          <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Estado Fiscal (ARCA)
            </label>

            <div className="bg-gray-100 dark:bg-slate-800/80 p-4 rounded-lg mb-4 flex flex-col gap-4 border border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">CUIT Emisor</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400"
                    value={arcaCuit}
                    onChange={e => setArcaCuit(e.target.value)}
                    placeholder="Ej. 20111111112 sin guiones"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Punto de Venta</label>
                  <input
                    type="number"
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400"
                    value={arcaPtoVta}
                    onChange={e => setArcaPtoVta(e.target.value)}
                    placeholder="Ej. 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Entorno</label>
                  <select
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                    value={arcaModo}
                    onChange={e => setArcaModo(e.target.value)}
                  >
                    <option value="homologacion">Homologación (Testing)</option>
                    <option value="produccion">Producción (Real)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Certificado (.crt)</label>
                  <textarea
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 font-mono text-xs"
                    rows={4}
                    value={certString}
                    onChange={e => setCertString(e.target.value)}
                    placeholder="Pegar el contenido completo del certificado -----BEGIN CERTIFICATE----- ..."
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Llave Privada (.key)</label>
                  <textarea
                    className="w-full p-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 font-mono text-xs"
                    rows={4}
                    value={keyString}
                    onChange={e => setKeyString(e.target.value)}
                    placeholder="Pegar el contenido completo de la llave -----BEGIN PRIVATE KEY----- ..."
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2 border-t border-gray-200 dark:border-slate-700 pt-4">
                <div>
                  {certCargado ? (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                      Certificado Activo (Cargado el {uploadedAt ? new Date(uploadedAt).toLocaleDateString() : 'N/A'})
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                      Sin Certificado
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Solo llena los cuadros de texto arriba si deseas actualizar el certificado actual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGuardarArca}
                  disabled={guardandoArca}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {guardandoArca ? 'Guardando...' : 'Guardar Configuración Fiscal'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleTestArca}
                  disabled={testeandoArca}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-6 py-2.5 rounded-lg font-bold hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors disabled:opacity-50 flex items-center gap-2 border border-blue-200 dark:border-blue-800/50"
                >
                  <Server size={18} />
                  {testeandoArca ? 'Conectando...' : 'Probar Conexión ARCA (Test)'}
                </button>
                <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm">
                  Consulta el último comprobante emitido para verificar la conexión con AFIP.
                </p>
              </div>

              {usuario?.rol === 'SUPERADMIN' && (
                <div className="flex items-center gap-4 mt-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
                  <button
                    type="button"
                    onClick={confirmarGenerarCSR}
                    disabled={generandoCsr}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Key size={18} />
                    {generandoCsr ? 'Generando...' : 'Generar Clave Privada y CSR'}
                  </button>
                  <p className="text-sm text-purple-800 dark:text-purple-300 max-w-md">
                    <span className="font-bold">Solo Superadmin:</span> Genera y descarga los archivos necesarios (.key y .csr) para solicitar el certificado digital en la web de AFIP.
                  </p>
                </div>
              )}
            </div>
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

      {/* Modal de confirmación para CSR */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden transition-colors duration-200 border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20">
              <h2 className="text-xl font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <Key size={24} />
                Generar Credenciales ARCA
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-gray-700 dark:text-slate-300">
                Esta acción generará una nueva <strong>Clave Privada (.key)</strong> y una <strong>Solicitud de Firma (.csr)</strong> para AFIP.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 text-sm text-blue-800 dark:text-blue-300">
                Los archivos se descargarán a tu computadora y también se guardarán automáticamente en la carpeta <code>certs</code> del servidor.
              </div>
              <p className="text-gray-700 dark:text-slate-300 font-medium">¿Estás seguro que deseas continuar?</p>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerarCSR}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
              >
                Sí, Generar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parametros;
