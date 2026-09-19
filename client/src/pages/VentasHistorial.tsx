import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RefreshCcw, XCircle, Search, AlertCircle, Printer, CheckCircle, FileText, PackageCheck, Send } from 'lucide-react';

interface VentaItem {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto?: {
    nombre: string;
    codigoBarras?: string;
  };
}

interface Venta {
  id: number;
  total: number;
  anulada: boolean;
  estado: string; // "FACTURADA" | "COMPLETADA" | "PRESUPUESTO" | "REMITO_PENDIENTE" | "REMITO_APROBADO" | "ANULADA"
  createdAt: string;
  medioPago: string;
  cliente?: { nombre: string; numeroDoc?: string } | null;
  usuario?: { nombre: string } | null;
  items: VentaItem[];
}

const VentasHistorial = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>(searchParams.get('tab') || 'TODAS'); 

  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);
  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false);
  const [anulando, setAnulando] = useState(false);

  // Modal Facturar (Aplica a PRESUPUESTO y REMITO_APROBADO)
  const [ventaAFacturar, setVentaAFacturar] = useState<Venta | null>(null);
  const [medioPagoFacturar, setMedioPagoFacturar] = useState('EFECTIVO');
  const [montoRecibidoFacturar, setMontoRecibidoFacturar] = useState('');
  const [facturando, setFacturando] = useState(false);
  const [aperturaCajaId, setAperturaCajaId] = useState<number | null>(null);

  // Empresa params
  const [empresaDatos, setEmpresaDatos] = useState({ razonSocial: 'Empresa / Comercio', cuit: '', direccion: '', condicionIva: '' });
  
  // Impresion A4
  const [documentoImprimir, setDocumentoImprimir] = useState<{venta: Venta, tipo: 'REMITO' | 'PRESUPUESTO' | 'FACTURA'} | null>(null);

  useEffect(() => {
    cargarVentas();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['TODAS', 'FACTURADA', 'PRESUPUESTO', 'REMITOS', 'ANULADA'].includes(tab.toUpperCase())) {
      setFiltroEstado(tab.toUpperCase());
    } else if (!tab) {
      setFiltroEstado('TODAS');
    }
  }, [searchParams]);

  const cargarVentas = async () => {
    try {
      setCargando(true);
      const res = await api.get('/ventas/historial');
      setVentas(res.data);
      
      const [resCaja, resRS, resCuit, resDir, resIva] = await Promise.all([
        api.get('/caja/estado'),
        api.get('/parametros/empresaRazonSocial'),
        api.get('/parametros/empresaCuit'),
        api.get('/parametros/empresaDireccion'),
        api.get('/parametros/empresaCondicionIva')
      ]);

      if (resCaja.data.abierta) setAperturaCajaId(resCaja.data.apertura.id);
      
      setEmpresaDatos({
        razonSocial: resRS.data?.valor || 'Empresa / Comercio',
        cuit: resCuit.data?.valor || '',
        direccion: resDir.data?.valor || '',
        condicionIva: resIva.data?.valor || ''
      });

    } catch (error) {
      toast.error('Error al cargar historial de ventas');
    } finally {
      setCargando(false);
    }
  };

  const handleAnular = async () => {
    if (!ventaAAnular) return;
    setAnulando(true);
    try {
      await api.post(`/ventas/${ventaAAnular.id}/anular`);
      toast.success('Documento anulado correctamente');
      cargarVentas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al anular');
    } finally {
      setAnulando(false);
      setVentaAAnular(null);
      setConfirmarAnulacion(false);
    }
  };

  const handleFacturar = async () => {
    if (!ventaAFacturar || !aperturaCajaId) return;
    setFacturando(true);
    
    let montoNum = Number(montoRecibidoFacturar);
    if (medioPagoFacturar !== 'EFECTIVO') montoNum = ventaAFacturar.total;

    try {
      const url = ventaAFacturar.estado === 'PRESUPUESTO' 
        ? `/ventas/${ventaAFacturar.id}/facturar-presupuesto`
        : `/ventas/${ventaAFacturar.id}/facturar-remito`;
        
      await api.post(url, {
        aperturaCajaId,
        medioPago: medioPagoFacturar,
        montoRecibido: montoNum
      });
      toast.success('Documento facturado correctamente');
      setVentaAFacturar(null);
      cargarVentas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al facturar documento');
    } finally {
      setFacturando(false);
    }
  };

  const handleAprobarRemito = async (id: number) => {
    try {
      await api.post(`/ventas/${id}/aprobar-remito`);
      toast.success('Remito Aprobado (Stock descontado)');
      cargarVentas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al aprobar remito');
    }
  };

  const handleConvertirPresupuesto = async (id: number) => {
    try {
      await api.post(`/ventas/${id}/presupuesto-a-remito`);
      toast.success('Presupuesto convertido a Remito Pendiente');
      cargarVentas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al convertir');
    }
  };

  const imprimirDocumento = (venta: Venta, tipo: 'REMITO' | 'PRESUPUESTO' | 'FACTURA') => {
    setDocumentoImprimir({ venta, tipo });
    setTimeout(() => {
      window.print();
      setDocumentoImprimir(null);
    }, 500);
  };

  const ventasFiltradas = ventas.filter(v => {
    const isRemito = v.estado === 'REMITO_PENDIENTE' || v.estado === 'REMITO_APROBADO';
    const isFacturada = v.estado === 'FACTURADA' || v.estado === 'COMPLETADA';
    const isAnulada = v.estado === 'ANULADA' || v.anulada;
    
    if (filtroEstado !== 'TODAS') {
      if (filtroEstado === 'REMITOS' && !isRemito) return false;
      if (filtroEstado === 'FACTURADA' && !isFacturada && !isAnulada) return false; // if anulada but it was factura, it's ANULADA now
      if (filtroEstado === 'PRESUPUESTO' && v.estado !== 'PRESUPUESTO') return false;
      if (filtroEstado === 'ANULADA' && !isAnulada) return false;
    }
    
    if (!filtroTexto) return true;
    const txt = filtroTexto.toLowerCase();
    return (
      v.id.toString().includes(txt) ||
      (v.cliente?.nombre || 'Consumidor Final').toLowerCase().includes(txt)
    );
  });

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 print:p-0 print:bg-white print:h-auto print:block">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Historial y Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de Facturas, Remitos y Presupuestos</p>
        </div>
        <div className="flex gap-2">
          {filtroEstado === 'PRESUPUESTO' && (
            <Link
              to="/ventas"
              className="flex items-center gap-2 px-4 py-2 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-300 transition-colors shadow-sm"
            >
              + Nuevo Presupuesto
            </Link>
          )}
          {filtroEstado === 'FACTURADA' && (
            <Link
              to="/ventas"
              className="flex items-center gap-2 px-4 py-2 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-300 transition-colors shadow-sm"
            >
              + Nueva Factura
            </Link>
          )}
          {filtroEstado === 'REMITOS' && (
            <Link
              to="/ventas"
              className="flex items-center gap-2 px-4 py-2 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-300 transition-colors shadow-sm"
            >
              + Nuevo Remito
            </Link>
          )}
          <button
            onClick={cargarVentas}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCcw size={18} /> Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden print:hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center overflow-x-auto">
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm mr-4 shrink-0">
            {['TODAS', 'FACTURADA', 'PRESUPUESTO', 'REMITOS', 'ANULADA'].map(est => (
              <button
                key={est}
                onClick={() => {
                  setFiltroEstado(est);
                  setSearchParams(est === 'TODAS' ? {} : { tab: est });
                }}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${filtroEstado === est ? 'bg-brand-light text-brand-dark shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {est}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por ID o Cliente..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-light"
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">N° Doc</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Cargando documentos...</td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No se encontraron documentos</td>
                </tr>
              ) : (
                ventasFiltradas.map(venta => {
                  const isAnulada = venta.anulada || venta.estado === 'ANULADA';
                  const isFacturada = venta.estado === 'FACTURADA' || venta.estado === 'COMPLETADA';
                  
                  return (
                  <tr key={venta.id} className={`hover:bg-gray-50 transition-colors ${isAnulada ? 'bg-red-50/30' : ''}`}>
                    <td className="p-4 font-mono text-sm text-gray-600">#{venta.id}</td>
                    <td className="p-4 text-sm text-gray-800">
                      {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(venta.createdAt))}
                    </td>
                    <td className="p-4 text-sm text-gray-800 font-medium">
                      {venta.cliente?.nombre || 'Consumidor Final'}
                    </td>
                    <td className="p-4 text-sm font-bold text-brand-dark">
                      ${Number(venta.total).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      {isAnulada ? (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">ANULADA</span>
                      ) : venta.estado === 'PRESUPUESTO' ? (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">PRESUPUESTO</span>
                      ) : venta.estado === 'REMITO_PENDIENTE' ? (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">REM. PENDIENTE</span>
                      ) : venta.estado === 'REMITO_APROBADO' ? (
                        <span className="inline-block px-2 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded">REM. APROBADO</span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">FACTURADA</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {!isAnulada && venta.estado === 'PRESUPUESTO' && (
                          <>
                            <button
                              onClick={() => handleConvertirPresupuesto(venta.id)}
                              className="text-purple-600 hover:text-purple-700 bg-purple-50 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                              title="Convertir a Remito"
                            >
                              <Send size={16} /> A Remito
                            </button>
                            <button
                              onClick={() => { setVentaAFacturar(venta); setMontoRecibidoFacturar(venta.total.toString()); }}
                              className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                              title="Facturar y Cobrar"
                            >
                              <CheckCircle size={16} /> Facturar
                            </button>
                            <button onClick={() => imprimirDocumento(venta, 'PRESUPUESTO')} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded" title="Imprimir A4">
                              <Printer size={16} />
                            </button>
                          </>
                        )}

                        {!isAnulada && venta.estado === 'REMITO_PENDIENTE' && (
                          <>
                            <button
                              onClick={() => handleAprobarRemito(venta.id)}
                              className="text-teal-600 hover:text-teal-700 bg-teal-50 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                              title="Aprobar (Descuenta Stock)"
                            >
                              <PackageCheck size={16} /> Aprobar
                            </button>
                            <button onClick={() => imprimirDocumento(venta, 'REMITO')} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded" title="Imprimir Remito A4">
                              <FileText size={16} />
                            </button>
                            <button onClick={() => setVentaAAnular(venta)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded" title="Anular">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {!isAnulada && venta.estado === 'REMITO_APROBADO' && (
                          <>
                            <button
                              onClick={() => { setVentaAFacturar(venta); setMontoRecibidoFacturar(venta.total.toString()); }}
                              className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                              title="Facturar (Cobrar)"
                            >
                              <CheckCircle size={16} /> Facturar
                            </button>
                            <button onClick={() => imprimirDocumento(venta, 'REMITO')} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded" title="Imprimir Remito A4">
                              <FileText size={16} />
                            </button>
                            <button onClick={() => setVentaAAnular(venta)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded" title="Anular">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {!isAnulada && isFacturada && (
                          <>
                            <button onClick={() => imprimirDocumento(venta, 'FACTURA')} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded" title="Imprimir Comprobante A4">
                              <Printer size={16} />
                            </button>
                            <button onClick={() => setVentaAAnular(venta)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded" title="Anular (Devolver Stock y Dinero)">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmar Anulación */}
      {ventaAAnular && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-500 p-6 flex flex-col items-center justify-center text-white">
              <AlertCircle size={48} className="mb-2" />
              <h2 className="text-xl font-bold">¿Anular Documento #{ventaAAnular.id}?</h2>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6">
                Esta acción cancelará el documento.
                {ventaAAnular.estado === 'REMITO_APROBADO' && " Se devolverá el stock."}
                {(ventaAAnular.estado === 'FACTURADA' || ventaAAnular.estado === 'COMPLETADA') && " Se devolverá el stock y se registrará el egreso de dinero en la caja."}
              </p>
              
              {!confirmarAnulacion ? (
                <div className="flex gap-3">
                  <button onClick={() => setVentaAAnular(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => setConfirmarAnulacion(true)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                    Sí, Anular
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 flex-col">
                  <div className="bg-red-50 p-3 rounded text-red-800 text-sm font-semibold mb-2 border border-red-100 text-center">
                    ¿Estás absolutamente seguro? Esta acción no se puede deshacer.
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmarAnulacion(false)} disabled={anulando} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                      Atrás
                    </button>
                    <button onClick={handleAnular} disabled={anulando} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50">
                      {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Facturar (Cobrar) */}
      {ventaAFacturar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-green-500 p-6 flex flex-col items-center justify-center text-white">
              <CheckCircle size={48} className="mb-2" />
              <h2 className="text-xl font-bold">Facturar Documento #{ventaAFacturar.id}</h2>
              <div className="text-3xl font-extrabold mt-2">${Number(ventaAFacturar.total).toFixed(2)}</div>
            </div>
            
            <div className="p-6">
              {!aperturaCajaId ? (
                <div className="text-red-500 font-bold text-center mb-4">
                  Debe abrir la caja para poder facturar y cobrar.
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Medio de pago</label>
                    <select
                      value={medioPagoFacturar}
                      onChange={e => setMedioPagoFacturar(e.target.value)}
                      className="w-full p-3 border rounded font-medium focus:border-brand-light focus:ring-1"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                      <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="QR">Mercado Pago / QR</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Monto Recibido</label>
                    <input
                      type="number"
                      disabled={medioPagoFacturar !== 'EFECTIVO'}
                      className="w-full p-3 border rounded font-bold text-xl disabled:bg-gray-100"
                      value={medioPagoFacturar === 'EFECTIVO' ? montoRecibidoFacturar : ventaAFacturar.total}
                      onChange={e => setMontoRecibidoFacturar(e.target.value)}
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-3">
                <button onClick={() => setVentaAFacturar(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">
                  Cancelar
                </button>
                <button
                  onClick={handleFacturar}
                  disabled={!aperturaCajaId || facturando || (medioPagoFacturar === 'EFECTIVO' && Number(montoRecibidoFacturar) < ventaAFacturar.total)}
                  className="flex-1 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:bg-gray-400"
                >
                  {facturando ? 'Procesando...' : 'Facturar y Cobrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documento A4 de Impresión (Estilo AFIP / ARCA) */}
      {documentoImprimir && (
        <div className="hidden print:block absolute inset-0 bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', margin: '0 auto', fontSize: '10pt', color: '#000', fontFamily: 'Arial, sans-serif' }}>
          <style>{`
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: white; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          `}</style>

          {/* CABECERA (Header) */}
          <div className="border-2 border-black mb-2 flex relative rounded">
            {/* Letra Central */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center justify-start bg-white w-12 border-x-2 border-black border-b-2 h-16 rounded-b-md">
              <div className="text-3xl font-extrabold leading-none mt-2">
                {documentoImprimir.tipo === 'REMITO' ? 'R' : documentoImprimir.tipo === 'PRESUPUESTO' ? 'X' : 'C'}
              </div>
              <div className="text-[8px] font-bold mt-1 text-center">
                CÓD. 000
              </div>
            </div>

            {/* Caja Izquierda: Empresa */}
            <div className="flex-1 p-3 pr-8 flex flex-col justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">{empresaDatos.razonSocial || 'EMPRESA GENÉRICA'}</h2>
              <div>
                <p className="text-xs mb-1"><strong>Razón Social:</strong> {empresaDatos.razonSocial}</p>
                <p className="text-xs mb-1"><strong>Domicilio Comercial:</strong> {empresaDatos.direccion}</p>
                <p className="text-xs"><strong>Condición frente al IVA:</strong> {empresaDatos.condicionIva}</p>
              </div>
            </div>

            {/* Caja Derecha: Datos Comprobante */}
            <div className="flex-1 p-3 pl-10 border-l-2 border-transparent border-t-0 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  {documentoImprimir.tipo === 'REMITO' ? 'REMITO' : documentoImprimir.tipo === 'PRESUPUESTO' ? 'PRESUPUESTO' : 'FACTURA'}
                </h1>
                <div className="text-lg font-bold mt-1 mb-3">
                  N° 0001-{documentoImprimir.venta.id.toString().padStart(8, '0')}
                </div>
                <p className="text-sm font-bold mb-3">Fecha de Emisión: {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(documentoImprimir.venta.createdAt))}</p>
              </div>
              <div>
                <p className="text-xs mb-1"><strong>CUIT:</strong> {empresaDatos.cuit || '00-00000000-0'}</p>
                <p className="text-xs mb-1"><strong>Ingresos Brutos:</strong> {empresaDatos.cuit || '00-00000000-0'}</p>
                <p className="text-xs"><strong>Fecha de Inicio de Actividades:</strong> -</p>
              </div>
            </div>
          </div>

          {/* DATOS DEL CLIENTE */}
          <div className="border-2 border-black rounded mb-2 p-3 flex justify-between text-xs">
            <div className="flex flex-col gap-1 w-1/2">
              <p><strong>CUIT / DNI:</strong> {documentoImprimir.venta.cliente?.numeroDoc || 'Consumidor Final'}</p>
              <p><strong>Condición frente al IVA:</strong> {documentoImprimir.venta.cliente?.condicionIva || 'Consumidor Final'}</p>
              <p><strong>Condición de venta:</strong> {documentoImprimir.venta.medioPago === 'EFECTIVO' ? 'Efectivo' : 'Otra'}</p>
            </div>
            <div className="flex flex-col gap-1 w-1/2 pl-4">
              <p><strong>Señor/es:</strong> {documentoImprimir.venta.cliente?.nombre || 'Consumidor Final'}</p>
              <p><strong>Domicilio:</strong> {documentoImprimir.venta.cliente?.direccion || '-'}</p>
            </div>
          </div>

          {/* GRILLA DE ITEMS */}
          <div className="border-2 border-black rounded flex-1 min-h-[150mm] relative flex flex-col">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200 border-b-2 border-black text-xs">
                  <th className="py-2 px-2 text-left font-bold border-r border-black w-24">Código</th>
                  <th className="py-2 px-2 text-left font-bold border-r border-black">Producto / Servicio</th>
                  <th className={`py-2 px-2 text-center font-bold w-20 ${(documentoImprimir.tipo === 'PRESUPUESTO' || documentoImprimir.tipo === 'FACTURA') ? 'border-r border-black' : ''}`}>Cantidad</th>
                  {(documentoImprimir.tipo === 'PRESUPUESTO' || documentoImprimir.tipo === 'FACTURA') && (
                    <>
                      <th className="py-2 px-2 text-right font-bold border-r border-black w-24">Precio Unit.</th>
                      <th className="py-2 px-2 text-right font-bold border-r border-black w-16">% Bonif.</th>
                      <th className="py-2 px-2 text-right font-bold w-28">Subtotal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="align-top">
                {documentoImprimir.venta.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 px-2 font-mono text-[11px] border-r border-black">{item.producto?.codigoBarras || '-'}</td>
                    <td className="py-1.5 px-2 text-[11px] font-medium border-r border-black uppercase">{item.producto?.nombre}</td>
                    <td className={`py-1.5 px-2 text-center text-[11px] ${(documentoImprimir.tipo === 'PRESUPUESTO' || documentoImprimir.tipo === 'FACTURA') ? 'border-r border-black' : ''}`}>{item.cantidad}</td>
                    {(documentoImprimir.tipo === 'PRESUPUESTO' || documentoImprimir.tipo === 'FACTURA') && (
                      <>
                        <td className="py-1.5 px-2 text-right text-[11px] border-r border-black">{Number(item.precioUnitario).toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right text-[11px] border-r border-black">0.00</td>
                        <td className="py-1.5 px-2 text-right text-[11px]">{Number(item.subtotal).toFixed(2)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER TOTALES */}
          {(documentoImprimir.tipo === 'PRESUPUESTO' || documentoImprimir.tipo === 'FACTURA') && (
            <div className="mt-2 border-2 border-black rounded p-3 flex justify-end">
              <div className="flex justify-between w-64 items-center">
                <span className="font-bold text-sm uppercase">Importe Total:</span>
                <span className="font-extrabold text-xl pr-2">${Number(documentoImprimir.venta.total).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* ESPACIO FIRMA PARA REMITO */}
          {documentoImprimir.tipo === 'REMITO' && (
            <div className="mt-8 border-2 border-black rounded p-4 grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-bold uppercase mb-8">Firma de Conformidad (Cliente)</p>
                <div className="border-b border-black w-full mb-1"></div>
                <div className="flex justify-between text-[10px]">
                  <span>Firma y Aclaración</span>
                  <span>DNI / CUIT</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase mb-8">Entregado Por (Local)</p>
                <div className="border-b border-black w-full mb-1"></div>
                <div className="flex justify-between text-[10px]">
                  <span>Firma y Aclaración</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="fixed bottom-8 left-0 right-0 text-center font-bold text-[10px]">
            {documentoImprimir.tipo === 'FACTURA' ? 'DOCUMENTO NO VÁLIDO COMO FACTURA - COMPROBANTE INTERNO' : 'DOCUMENTO NO VÁLIDO COMO FACTURA'} - Generado por PuntoVeloz
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasHistorial;
