import React, { useState, useEffect } from 'react';
import { Server, Key, Save, CheckCircle, AlertTriangle, Plus, Trash2, Edit2, ShieldAlert, Search, Upload } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ConfiguracionesAdmin() {
  const [cargando, setCargando] = useState(true);

  // Datos Configuración General
  const [arcaCuit, setArcaCuit] = useState('');
  const [arcaModo, setArcaModo] = useState('homologacion');
  const [conceptoDefecto, setConceptoDefecto] = useState('1');
  const [limiteMonto, setLimiteMonto] = useState('344000');
  const [leyendaFactura, setLeyendaFactura] = useState('');
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  // Certificados & Diagnóstico
  const [certStatus, setCertStatus] = useState({ certExists: false, keyExists: false });
  const [testeando, setTesteando] = useState(false);
  const [diagPtoVta, setDiagPtoVta] = useState('');
  const [diagCbteTipo, setDiagCbteTipo] = useState('11');
  const [consultandoUltimo, setConsultandoUltimo] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [subiendoCert, setSubiendoCert] = useState(false);

  // Puntos de Venta
  const [puntosVenta, setPuntosVenta] = useState<any[]>([]);
  const [cargandoPV, setCargandoPV] = useState(false);
  const [pvEditando, setPvEditando] = useState<any>(null);
  const [pvForm, setPvForm] = useState({ numero: '', descripcion: '', tipo: 'WEBSERVICE' });
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    const ws = puntosVenta.filter(p => p.tipo === 'WEBSERVICE' && p.activo !== false);
    if (ws.length === 1) {
      setDiagPtoVta(ws[0].numero.toString());
    } else if (ws.length > 1) {
      try {
        const lastUsed = localStorage.getItem('last_diag_pto_vta');
        if (lastUsed && ws.find(p => p.numero.toString() === lastUsed)) {
          setDiagPtoVta(lastUsed);
        }
      } catch (e) {}
    }
  }, [puntosVenta]);

  const cargarTodo = async () => {
    try {
      setCargando(true);
      await Promise.all([
        cargarConfiguraciones(),
        cargarPuntosVenta(),
      ]);
    } catch (err) {
      toast.error('Error al cargar configuraciones de ARCA');
    } finally {
      setCargando(false);
    }
  };

  const cargarConfiguraciones = async () => {
    try {
      const resConfig = await api.get('/comercio/arca-config');
      if (resConfig.data) {
        setArcaCuit(resConfig.data.arcaCuit || '');
        setArcaModo(resConfig.data.arcaModo || 'homologacion');
      }
      
      const resStatus = await api.get('/arca/status-certificados');
      if (resStatus.data) {
        setCertStatus(resStatus.data);
      }

      const [resC, resL, resLey] = await Promise.all([
        api.get('/parametros/arcaConceptoDefecto'),
        api.get('/parametros/arcaLimiteMonto'),
        api.get('/parametros/arcaLeyendaFactura')
      ]);
      if (resC.data?.valor) setConceptoDefecto(resC.data.valor);
      if (resL.data?.valor) setLimiteMonto(resL.data.valor);
      if (resLey.data?.valor) setLeyendaFactura(resLey.data.valor);

    } catch (e) {
      console.error(e);
    }
  };

  const guardarConfiguraciones = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoConfig(true);
    try {
      await api.post('/comercio/arca-config', {
        arcaCuit,
        modo: arcaModo,
        cuit: arcaCuit
      });

      await Promise.all([
        api.put('/parametros/arcaConceptoDefecto', { valor: conceptoDefecto }),
        api.put('/parametros/arcaLimiteMonto', { valor: limiteMonto }),
        api.put('/parametros/arcaLeyendaFactura', { valor: leyendaFactura })
      ]);
      
      toast.success('Configuración Fiscal guardada exitosamente');
      cargarConfiguraciones();
    } catch (err) {
      toast.error('Error al guardar las configuraciones');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const cargarPuntosVenta = async () => {
    try {
      setCargandoPV(true);
      const res = await api.get('/arca/puntos-venta');
      setPuntosVenta(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoPV(false);
    }
  };

  const guardarPv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pvForm.numero || !pvForm.descripcion) return toast.error('Completar campos requeridos');
    
    try {
      if (pvEditando) {
        await api.put(`/arca/puntos-venta/${pvEditando.id}`, pvForm);
        toast.success('Punto de Venta actualizado');
      } else {
        await api.post('/arca/puntos-venta', pvForm);
        toast.success('Punto de Venta creado');
      }
      setPvEditando(null);
      setPvForm({ numero: '', descripcion: '', tipo: 'WEBSERVICE' });
      cargarPuntosVenta();
    } catch (e) {
      toast.error('Error al guardar el Punto de Venta');
    }
  };

  const eliminarPv = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este Punto de Venta?')) return;
    try {
      await api.delete(`/arca/puntos-venta/${id}`);
      toast.success('Eliminado correctamente');
      cargarPuntosVenta();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const subirCertificados = async () => {
    if (!certFile || !keyFile) {
      toast.error('Debe seleccionar ambos archivos (.crt y .key)');
      return;
    }
    setSubiendoCert(true);
    try {
      const readAsText = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const certContent = await readAsText(certFile);
      const keyContent = await readAsText(keyFile);

      await api.post('/comercio/arca-config', {
        cert: certContent,
        key: keyContent,
        cuit: arcaCuit,
        modo: arcaModo
      });

      toast.success('✅ Certificados subidos y guardados correctamente');
      setCertFile(null);
      setKeyFile(null);
      cargarConfiguraciones();
    } catch (e: any) {
      toast.error(`❌ Error al subir: ${e.response?.data?.error || e.message}`);
    } finally {
      setSubiendoCert(false);
    }
  };

  const testConexion = async () => {
    if (!diagPtoVta) {
      return toast.error('Seleccione un Punto de Venta tipo WEBSERVICE para probar la conexión');
    }
    
    try {
      localStorage.setItem('last_diag_pto_vta', diagPtoVta);
    } catch (e) {}

    setTesteando(true);

    try {
      await api.get('/ventas/test-arca', {
        params: { ptoVta: diagPtoVta, cbteTipo: diagCbteTipo }
      });
      toast.success('✅ Conexión con AFIP Exitosa');
    } catch (e: any) {
      toast.error(`❌ Fallo de conexión: ${e.response?.data?.error || e.message}`, { duration: 6000 });
    } finally {
      setTesteando(false);
    }
  };

  const sincronizarPVs = async () => {
    try {
      setSyncResult(null);
      toast.loading('Sincronizando puntos de venta con ARCA...', { id: 'sync' });
      const res = await api.post('/arca/puntos-venta/sync');
      toast.dismiss('sync');
      
      const { conflictos } = res.data;
      if (conflictos && conflictos.length > 0) {
        toast.error(`Sincronizado con conflictos. Revise el recuadro rojo abajo.`, { duration: 8000 });
      } else {
        toast.success(`✅ Sincronización exitosa. Se actualizaron ${res.data.count} puntos de venta.`, { duration: 5000 });
      }
      setSyncResult(res.data);
      cargarPuntosVenta();
    } catch (e: any) {
      toast.dismiss('sync');
      toast.error(`❌ Error al sincronizar: ${e.response?.data?.error || e.message}`, { duration: 6000 });
    }
  };

  const generarCSR = async () => {
    try {
      toast.loading('Generando CSR y Key... Aguarde...', { id: 'csr' });
      const res = await api.post('/parametros/generar-csr');
      toast.dismiss('csr');
      toast.success('✅ Certificados generados exitosamente.', { duration: 5000 });
      
      // Descarga automática de los certificados si vienen en la respuesta
      if (res.data?.csrPem) {
        const blob = new Blob([res.data.csrPem, '\n\n--- PRIVATE KEY ---\n', res.data.privateKeyPem], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Certificados_ARCA.txt';
        a.click();
      }
    } catch (e: any) {
      toast.dismiss('csr');
      toast.error(`❌ Error al generar CSR: ${e.response?.data?.error || e.message}`, { duration: 6000 });
    }
  };

  const purgarCache = async () => {
    try {
      await api.delete('/comercio/arca-tokens');
      toast.success('✅ Caché WSAA purgada exitosamente');
    } catch (e: any) {
      toast.error(`❌ Error al purgar caché: ${e.message}`);
    }
  };

  const consultarUltimoComprobante = async () => {
    if (!diagPtoVta) {
      return toast.error('Seleccione un Punto de Venta tipo WEBSERVICE para consultar');
    }
    setConsultandoUltimo(true);
    try {
      const res = await api.get('/ventas/test-arca', {
        params: { ptoVta: diagPtoVta, cbteTipo: diagCbteTipo }
      });
      if (res.data.isZero) {
        toast.success(`✅ Conexión exitosa con ARCA. Último comprobante: 0 (Sin emisiones)`, { duration: 6000 });
      } else {
        toast.success(`✅ Último comprobante en AFIP: ${res.data.ultimoComprobante}`, { duration: 6000 });
      }
    } catch (e: any) {
      toast.error(`❌ Error al consultar: ${e.response?.data?.error || e.message}`);
    } finally {
      setConsultandoUltimo(false);
    }
  };

  if (cargando) {
    return <div className="h-full flex items-center justify-center text-gray-500">Cargando configuraciones ARCA...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 transition-colors">
      <div className="p-3 border-b border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 flex items-center gap-3">
        <ShieldAlert size={20} className="text-red-600" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wide">Configuración ARCA</h1>
      </div>

      <div className="flex-1 overflow-y-auto w-full flex flex-col">
        
        {/* SECCIÓN SUPERIOR: GENERAL Y PREFERENCIAS */}
        <form onSubmit={guardarConfiguraciones} className="p-4 border-b border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="mb-2">
            <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Parámetros Operativos</span>
          </div>
          <div className="grid grid-cols-5 gap-4 items-end mb-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">CUIT Emisor</label>
              <input 
                type="text" 
                value={arcaCuit}
                onChange={e => setArcaCuit(e.target.value)}
                className="w-full p-2 border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Entorno AFIP</label>
              <select 
                value={arcaModo}
                onChange={e => setArcaModo(e.target.value)}
                className="w-full p-2 border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
              >
                <option value="homologacion">Homologación (Testing)</option>
                <option value="produccion">Producción (Real)</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Concepto por Defecto</label>
              <select 
                value={conceptoDefecto}
                onChange={e => setConceptoDefecto(e.target.value)}
                className="w-full p-2 border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
              >
                <option value="1">1 - Productos</option>
                <option value="2">2 - Servicios</option>
                <option value="3">3 - Bienes y Servicios</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Límite Monto DNI ($) <span title="Límite AFIP para consumidor final" className="text-gray-400 cursor-help">(?)</span></label>
              <input 
                type="number" 
                value={limiteMonto}
                onChange={e => setLimiteMonto(e.target.value)}
                className="w-full p-2 border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Leyenda Factura A4</label>
              <input 
                type="text" 
                value={leyendaFactura}
                onChange={e => setLeyendaFactura(e.target.value)}
                placeholder="Ej. Los cambios son dentro de 30 días"
                className="w-full p-2 border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
          <div>
            <button type="submit" disabled={guardandoConfig} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 text-sm font-bold flex items-center gap-2 border border-red-800 rounded-sm">
              <Save size={16} /> {guardandoConfig ? 'Guardando...' : 'Guardar Configuraciones'}
            </button>
          </div>
        </form>

        {/* SECCIÓN MEDIA: CERTIFICADOS Y DIAGNÓSTICO */}
        <div className="p-4 border-b border-gray-300 dark:border-slate-700 flex flex-col gap-4 bg-gray-100 dark:bg-slate-800">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">Certificados Instalados</span>
                <div className="flex gap-4">
                  <span className={`text-xs font-bold flex items-center gap-1 ${certStatus.certExists ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {certStatus.certExists ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>} arca.crt
                  </span>
                  <span className={`text-xs font-bold flex items-center gap-1 ${certStatus.keyExists ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {certStatus.keyExists ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>} arca.key
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 border-l pl-4 border-gray-300 dark:border-slate-600">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Subir / Reemplazar</span>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 mb-0.5">.crt (Certificado)</span>
                    <input 
                      type="file" 
                      accept=".crt,.pem" 
                      onChange={e => setCertFile(e.target.files?.[0] || null)} 
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-gray-200 dark:file:bg-slate-700 file:text-gray-700 dark:file:text-slate-300 hover:file:bg-gray-300 dark:hover:file:bg-slate-600 cursor-pointer" 
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 mb-0.5">.key (Llave Privada)</span>
                    <input 
                      type="file" 
                      accept=".key,.pem" 
                      onChange={e => setKeyFile(e.target.files?.[0] || null)} 
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-gray-200 dark:file:bg-slate-700 file:text-gray-700 dark:file:text-slate-300 hover:file:bg-gray-300 dark:hover:file:bg-slate-600 cursor-pointer" 
                    />
                  </div>
                  <button 
                    onClick={subirCertificados} 
                    disabled={!certFile || !keyFile || subiendoCert} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 mt-3 text-sm font-bold flex items-center gap-2 border border-indigo-800 rounded-sm disabled:opacity-50 transition-colors"
                  >
                    <Upload size={14} /> {subiendoCert ? 'Subiendo...' : 'Subir'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={generarCSR} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 border border-green-800 rounded-sm">
                Generar Certificados / CSR
              </button>
              <button onClick={testConexion} disabled={testeando} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 border border-blue-800 rounded-sm disabled:opacity-50">
                <Server size={14} /> Probar Conexión (Ping)
              </button>
              <button onClick={purgarCache} className="bg-gray-800 hover:bg-black text-white px-4 py-2 text-sm font-bold flex items-center gap-2 border border-gray-900 rounded-sm">
                <Key size={14} /> Purgar Caché WSAA
              </button>
            </div>
          </div>

          <div className="flex flex-col pt-3 border-t border-gray-300 dark:border-slate-700">
            <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">Diagnóstico: Último Comprobante Autorizado</span>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Punto de Venta</label>
                <select 
                  value={diagPtoVta} 
                  onChange={e => {
                    setDiagPtoVta(e.target.value);
                    try { localStorage.setItem('last_diag_pto_vta', e.target.value); } catch(err){}
                  }} 
                  className="w-48 p-2 text-sm border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-900 focus:outline-none" 
                >
                  <option value="">Seleccionar punto de venta...</option>
                  {puntosVenta.filter(p => p.tipo === 'WEBSERVICE' && p.activo !== false).map(pv => (
                    <option key={pv.id} value={pv.numero.toString()}>
                      {pv.numero} - {pv.descripcion || pv.nombre || ''}
                    </option>
                  ))}
                </select>
                {puntosVenta.filter(p => p.tipo === 'WEBSERVICE' && p.activo !== false).length === 0 && (
                  <div className="mt-1 text-xs text-red-500">
                    No hay webservices. <button onClick={sincronizarPVs} className="underline font-bold">Sincronizar</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tipo de Comprobante</label>
                <select 
                  value={diagCbteTipo} 
                  onChange={e => setDiagCbteTipo(e.target.value)} 
                  className="w-48 p-2 text-sm border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-900 focus:outline-none"
                >
                  <option value="11">Factura C (11)</option>
                  <option value="6">Factura B (6)</option>
                  <option value="1">Factura A (1)</option>
                </select>
              </div>
              <button 
                onClick={consultarUltimoComprobante} 
                disabled={consultandoUltimo} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 border border-indigo-800 rounded-sm disabled:opacity-50"
              >
                <Search size={14} /> Consultar Último
              </button>
            </div>

          </div>
        </div>

        {/* SECCIÓN INFERIOR: PUNTOS DE VENTA ABM */}
        <div className="p-4 w-full flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Puntos de Venta (ABM)</span>
            <button onClick={sincronizarPVs} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs font-bold border border-blue-800 rounded-sm flex items-center gap-1">
              <Server size={12} /> Sincronizar con ARCA
            </button>
          </div>

          {syncResult && (
            <div className={`mb-4 p-3 border rounded-sm text-sm ${syncResult.conflictos?.length > 0 ? 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-800' : 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-800'}`}>
              <div className="font-bold flex justify-between">
                <span>Resultados de la sincronización ({syncResult.count} puntos)</span>
                <button onClick={() => setSyncResult(null)}><X size={14} /></button>
              </div>
              
              {syncResult.conflictos?.length > 0 && (
                <div className="mt-2 text-red-700 dark:text-red-400">
                  <p className="font-bold mb-1">⚠️ Conflictos (Atención Requerida):</p>
                  <ul className="list-disc pl-5">
                    {syncResult.conflictos.map((c: any, i: number) => (
                      <li key={i}><strong>PV {c.numero}</strong>: {c.motivo}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {syncResult.procesados?.length > 0 && (
                <div className="mt-2 text-green-700 dark:text-green-400">
                  <p className="font-bold mb-1">✅ Procesados exitosamente:</p>
                  <ul className="list-disc pl-5">
                    {syncResult.procesados.map((p: any, i: number) => (
                      <li key={i}><strong>PV {p.numero}</strong>: {p.motivo} {p.activo ? '(Activo)' : '(Inactivo)'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={guardarPv} className="grid grid-cols-7 gap-2 mb-4 bg-gray-50 dark:bg-slate-800 p-2 border border-gray-300 dark:border-slate-700 items-end">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Nro Pto. Venta</label>
              <input type="number" required value={pvForm.numero} onChange={e => setPvForm({...pvForm, numero: e.target.value})} className="w-full p-1.5 text-sm border border-gray-400 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Descripción</label>
              <input type="text" required value={pvForm.descripcion} onChange={e => setPvForm({...pvForm, descripcion: e.target.value})} className="w-full p-1.5 text-sm border border-gray-400 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Tipo</label>
              <select value={pvForm.tipo || 'WEBSERVICE'} onChange={e => setPvForm({...pvForm, tipo: e.target.value})} className="w-full p-1.5 text-sm border border-gray-400 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none">
                <option value="MANUAL">MANUAL (Ticket Interno)</option>
                <option value="WEBSERVICE">WEBSERVICE (Factura ARCA)</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="flex-1 bg-gray-800 hover:bg-black text-white text-sm font-bold py-1.5 border border-gray-900 rounded-sm">
                {pvEditando ? 'Actualizar' : 'Agregar Pto. Venta'}
              </button>
              {pvEditando && (
                <button type="button" onClick={() => { setPvEditando(null); setPvForm({numero: '', descripcion: '', tipo: 'WEBSERVICE'})}} className="px-3 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-bold border border-gray-400 rounded-sm">
                  X
                </button>
              )}
            </div>
          </form>

          <div className="flex-1 border border-gray-300 dark:border-slate-700 overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-200 dark:bg-slate-800 border-b border-gray-400 dark:border-slate-600">
                <tr>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold w-20 text-center">Nro</th>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold">Descripción</th>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold w-32">Tipo</th>
                  <th className="p-2 font-bold w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {puntosVenta.map(pv => (
                  <tr key={pv.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-yellow-50 dark:hover:bg-slate-700/50">
                    <td className="p-2 border-r border-gray-200 dark:border-slate-700 text-center font-bold">{pv.numero}</td>
                    <td className="p-2 border-r border-gray-200 dark:border-slate-700">{pv.descripcion}</td>
                    <td className="p-2 border-r border-gray-200 dark:border-slate-700">{pv.tipo}</td>
                    <td className="p-1 text-center">
                      <button onClick={() => { setPvEditando(pv); setPvForm({numero: pv.numero, descripcion: pv.descripcion, tipo: pv.tipo}); }} className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 rounded-sm mr-1" title="Editar">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => eliminarPv(pv.id)} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded-sm" title="Eliminar">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {puntosVenta.length === 0 && !cargandoPV && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sin datos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
