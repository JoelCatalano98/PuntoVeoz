import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RefreshCcw, XCircle, Search, AlertCircle, Printer, CheckCircle, FileText, PackageCheck, Send, Download, Edit2 } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { FacturaA4 } from '../components/FacturaA4';
import { TicketVenta } from '../components/TicketVenta';
import { DocumentoA4 } from '../components/DocumentoA4';
import ConfirmacionEmision from '../components/ConfirmacionEmision';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroCae, setFiltroCae] = useState('TODAS'); // TODAS | CON_CAE | SIN_CAE
  const limit = 20;

  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);
  const [anulando, setAnulando] = useState(false);

  // Modal Facturar (Aplica a PRESUPUESTO y REMITO_APROBADO)
  const [ventaAFacturar, setVentaAFacturar] = useState<Venta | null>(null);
  const [medioPagoFacturar, setMedioPagoFacturar] = useState('EFECTIVO');
  const [montoRecibidoFacturar, setMontoRecibidoFacturar] = useState('');
  const [facturando, setFacturando] = useState(false);
  const [aperturaCajaId, setAperturaCajaId] = useState<number | null>(null);

  // Empresa params
  const [empresaDatos, setEmpresaDatos] = useState({ razonSocial: 'Empresa / Comercio', cuit: '', direccion: '', condicionIva: '' });
  const [logoError, setLogoError] = useState(false);

  // Impresion A4 / TICKET
  const [documentoImprimir, setDocumentoImprimir] = useState<{ venta: Venta, tipo: 'REMITO' | 'PRESUPUESTO' | 'FACTURA' } | null>(null);
  
  // Formatos
  const [fmtFE, setFmtFE] = useState('A4');
  const [fmtPresupuesto, setFmtPresupuesto] = useState('A4');
  const [fmtRemito, setFmtRemito] = useState('A4');
  const [fmtNC, setFmtNC] = useState('A4');

  useEffect(() => {
    cargarVentas(1);
  }, [fechaDesde, fechaHasta, filtroCae]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarVentas(1, filtroTexto);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [filtroTexto]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['TODAS', 'FACTURADA', 'PRESUPUESTO', 'REMITOS', 'ANULADA'].includes(tab.toUpperCase())) {
      setFiltroEstado(tab.toUpperCase());
    } else if (!tab) {
      setFiltroEstado('TODAS');
    }
  }, [searchParams]);

  const cargarVentas = async (pageToLoad = page, searchTxt = filtroTexto, estadoTxt = filtroEstado) => {
    try {
      setCargando(true);
      const params: any = { page: pageToLoad, limit, search: searchTxt, tab: estadoTxt !== 'TODAS' ? estadoTxt : undefined };
      if (fechaDesde && fechaHasta) {
        params.fechaDesde = fechaDesde;
        params.fechaHasta = fechaHasta;
      }
      if (filtroCae !== 'TODAS' && (estadoTxt === 'FACTURADA' || estadoTxt === 'TODAS')) {
        params.filtroCae = filtroCae;
      }

      const res = await api.get('/ventas/historial', { params });
      setVentas(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.totalCount);
      setPage(pageToLoad);

      const [resCaja, resRS, resCuit, resDir, resIva, resFE, resPresup, resRemito, resNC] = await Promise.all([
        api.get('/caja/estado'),
        api.get('/parametros/empresaRazonSocial'),
        api.get('/parametros/empresaCuit'),
        api.get('/parametros/empresaDireccion'),
        api.get('/parametros/empresaCondicionIva'),
        api.get('/parametros/impresionFacturaElectronica'),
        api.get('/parametros/impresionPresupuesto'),
        api.get('/parametros/impresionRemito'),
        api.get('/parametros/impresionNotaCredito')
      ]);

      if (resCaja.data.abierta) setAperturaCajaId(resCaja.data.apertura.id);

      setEmpresaDatos({
        razonSocial: resRS.data?.valor || 'Empresa / Comercio',
        cuit: resCuit.data?.valor || '',
        direccion: resDir.data?.valor || '',
        condicionIva: resIva.data?.valor || ''
      });

      if (resFE.data?.valor) setFmtFE(resFE.data.valor);
      if (resPresup.data?.valor) setFmtPresupuesto(resPresup.data.valor);
      if (resRemito.data?.valor) setFmtRemito(resRemito.data.valor);
      if (resNC.data?.valor) setFmtNC(resNC.data.valor);

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
      if (ventaAAnular.cae) {
        await api.post(`/ventas/${ventaAAnular.id}/nota-credito`);
        toast.success('Nota de Crédito emitida correctamente');
      } else {
        await api.post(`/ventas/${ventaAAnular.id}/anular`);
        toast.success('Documento anulado correctamente');
      }
      cargarVentas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al anular');
    } finally {
      setAnulando(false);
      setVentaAAnular(null);
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
        : ventaAFacturar.estado === 'REMITO_PENDIENTE'
          ? `/ventas/${ventaAFacturar.id}/aprobar-facturar`
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

  const imprimirDocumento = (venta: Venta, tipo: 'REMITO' | 'PRESUPUESTO' | 'FACTURA', esPdf = false) => {
    setDocumentoImprimir({ venta, tipo });
    if (esPdf) {
      toast.success('En la siguiente ventana emergente, selecciona "Guardar como PDF" como Destino.', { duration: 4000 });
    }
    setTimeout(() => {
      window.print();
      setDocumentoImprimir(null);
    }, 500);
  };

  const ventasFiltradas = ventas;

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-200 print:p-0 print:bg-white print:h-auto print:block">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-brand-light">Historial y Documentos</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Gestión de Facturas, Remitos y Presupuestos</p>
        </div>
        <div className="flex gap-2">
          {filtroEstado === 'PRESUPUESTO' && (
            <Link
              to="/documento-form?tipo=PRESUPUESTO"
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
              to="/documento-form?tipo=REMITO"
              className="flex items-center gap-2 px-4 py-2 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-300 transition-colors shadow-sm"
            >
              + Nuevo Remito
            </Link>
          )}
          <button
            onClick={cargarVentas}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCcw size={18} /> Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden print:hidden transition-colors duration-200">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-col gap-4 overflow-x-auto transition-colors">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
              {['TODAS', 'FACTURADA', 'PRESUPUESTO', 'REMITOS', 'ANULADA'].map(est => (
                <button
                  key={est}
                  onClick={() => {
                    setFiltroEstado(est);
                    setSearchParams(est === 'TODAS' ? {} : { tab: est });
                    cargarVentas(1, filtroTexto, est);
                  }}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${filtroEstado === est ? 'bg-brand-light text-brand-dark shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  {est}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por ID o Cliente..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 text-sm"
                value={filtroTexto}
                onChange={e => setFiltroTexto(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 items-center">
              <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            </div>
            
            {(filtroEstado === 'FACTURADA' || filtroEstado === 'TODAS') && (
              <div className="flex gap-2 items-center">
                <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Tipo:</label>
                <select
                  value={filtroCae}
                  onChange={e => setFiltroCae(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-light"
                >
                  <option value="TODAS">Todas</option>
                  <option value="CON_CAE">Solo Electrónicas</option>
                  <option value="SIN_CAE">Solo Manuales</option>
                </select>
              </div>
            )}

            {(fechaDesde || fechaHasta || filtroTexto || filtroCae !== 'TODAS') && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroTexto(''); setFiltroCae('TODAS'); }}
                className="text-sm text-brand-dark hover:text-brand-light font-medium transition-colors ml-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-24">N° Doc</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
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
                    <tr key={venta.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${isAnulada ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                      <td className="p-4 font-mono text-sm text-gray-600 dark:text-slate-400">#{venta.id}</td>
                      <td className="p-4 text-sm text-gray-800 dark:text-slate-200">
                        {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(venta.createdAt))}
                      </td>
                      <td className="p-4 text-sm text-gray-800 dark:text-slate-200 font-medium">
                        {venta.cliente?.nombre || 'Consumidor Final'}
                      </td>
                      <td className="p-4 text-sm font-bold text-brand-dark dark:text-brand-light">
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
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Convertir a Remito"
                              >
                                <Send size={16} /> A Remito
                              </button>
                              <Link
                                to={`/documento-form/${venta.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Editar Presupuesto"
                              >
                                <Edit2 size={16} /> Editar
                              </Link>
                              <button
                                onClick={() => { setVentaAFacturar(venta); setMontoRecibidoFacturar(venta.total.toString()); }}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Facturar y Cobrar"
                              >
                                <CheckCircle size={16} /> Facturar
                              </button>
                              <button onClick={() => imprimirDocumento(venta, 'PRESUPUESTO')} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 p-1.5 rounded" title="Imprimir A4">
                                <Printer size={16} />
                              </button>
                              <button onClick={() => imprimirDocumento(venta, 'PRESUPUESTO', true)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded" title="Guardar como PDF">
                                <Download size={16} />
                              </button>
                            </>
                          )}

                          {!isAnulada && venta.estado === 'REMITO_PENDIENTE' && (
                            <>
                              <button
                                onClick={() => handleAprobarRemito(venta.id)}
                                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/30 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Aprobar (Descuenta Stock)"
                              >
                                <PackageCheck size={16} /> Aprobar
                              </button>
                              <button
                                onClick={() => { setVentaAFacturar(venta); setMontoRecibidoFacturar(venta.total.toString()); }}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                title="Aprobar y Facturar"
                              >
                                <CheckCircle size={16} /> Facturar
                              </button>
                              <button onClick={() => imprimirDocumento(venta, 'REMITO')} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 p-1.5 rounded" title="Imprimir Remito A4">
                                <FileText size={16} />
                              </button>
                              <button onClick={() => imprimirDocumento(venta, 'REMITO', true)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded" title="Guardar como PDF">
                                <Download size={16} />
                              </button>
                              <button onClick={() => setVentaAAnular(venta)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded" title="Anular">
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
                              <button onClick={() => imprimirDocumento(venta, 'REMITO', true)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded" title="Guardar como PDF">
                                <Download size={16} />
                              </button>
                              <button onClick={() => setVentaAAnular(venta)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded" title="Anular">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {!isAnulada && isFacturada && (
                            <>
                              <button onClick={() => imprimirDocumento(venta, 'FACTURA')} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 p-1.5 rounded" title="Imprimir Comprobante A4">
                                <Printer size={16} />
                              </button>
                              <button onClick={() => imprimirDocumento(venta, 'FACTURA', true)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded" title="Guardar como PDF">
                                <Download size={16} />
                              </button>
                              {venta.cae ? (
                                <button onClick={() => setVentaAAnular(venta)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/30 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold" title="Emitir Nota de Crédito Fiscal">
                                  <RefreshCcw size={16} /> Emitir NC
                                </button>
                              ) : (
                                <button onClick={() => setVentaAAnular(venta)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded" title="Anular Internamente (Devolver Stock y Dinero)">
                                  <XCircle size={16} />
                                </button>
                              )}
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
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={(newPage) => cargarVentas(newPage)}
        />
      </div>

      <ConfirmacionEmision
        isOpen={!!ventaAAnular}
        onCancel={() => { setVentaAAnular(null); }}
        onConfirm={handleAnular}
        title={ventaAAnular?.cae ? "Confirmar Emisión de Nota de Crédito" : "Confirmar Anulación Interna"}
        isDestructive={true}
      >
        {ventaAAnular && (
          <div className="space-y-4">
            {ventaAAnular.cae ? (() => {
              const letraOrig = ventaAAnular.tipoComprobante?.replace('FACTURA_', '') || 'C';
              const letraNC = letraOrig;
              const nroOrigStr = `${String(ventaAAnular.puntoVenta?.numero || 1).padStart(4, '0')}-${String(ventaAAnular.nroFactura || ventaAAnular.id).padStart(8, '0')}`;
              
              return (
                <>
                  <p>
                    Vas a emitir una <strong>Nota de Crédito {letraNC}</strong> por <strong>${Number(ventaAAnular.total).toFixed(2)}</strong>, anulando la <strong>Factura {letraOrig} N° {nroOrigStr}</strong> de <strong>{ventaAAnular.cliente?.razonSocial || ventaAAnular.cliente?.nombre || 'Consumidor Final'}</strong>.
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
                    <ul className="text-sm space-y-2">
                      <li className="flex justify-between"><span>Factura a anular:</span> <span className="font-bold text-red-700 dark:text-red-400">N° {nroOrigStr}</span></li>
                      <li className="flex justify-between"><span>Cliente:</span> <span className="font-semibold">{ventaAAnular.cliente?.razonSocial || ventaAAnular.cliente?.nombre}</span></li>
                      <li className="flex justify-between text-lg pt-2 border-t border-red-200 dark:border-red-800/50 mt-2">
                        <span>Total a Devolver:</span> 
                        <span className="font-bold text-red-700 dark:text-red-400">
                          ${Number(ventaAAnular.total).toFixed(2)}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
                    <AlertCircle size={16} /> Esta acción es irreversible y se informará a AFIP. ¿Confirmar?
                  </p>
                </>
              );
            })() : (
              <p>
                Vas a anular el documento interno <strong>#{ventaAAnular.id}</strong>.
                {ventaAAnular.estado === 'REMITO_APROBADO' && " Se devolverá el stock."}
                {(ventaAAnular.estado === 'FACTURADA' || ventaAAnular.estado === 'COMPLETADA') && " Se devolverá el stock y se registrará el egreso de dinero en la caja."}
                <br/><br/>¿Confirmar anulación?
              </p>
            )}
          </div>
        )}
      </ConfirmacionEmision>

      {/* Modal Facturar (Cobrar) */}
      {ventaAFacturar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transition-colors duration-200">
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
                    <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">Medio de pago</label>
                    <select
                      value={medioPagoFacturar}
                      onChange={e => setMedioPagoFacturar(e.target.value)}
                      className="w-full p-3 border dark:border-slate-600 rounded font-medium focus:border-brand-light focus:ring-1 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 outline-none"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                      <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="QR">Mercado Pago / QR</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">Monto Recibido</label>
                    <input
                      type="number"
                      disabled={medioPagoFacturar !== 'EFECTIVO'}
                      className="w-full p-3 border dark:border-slate-600 rounded font-bold text-xl disabled:bg-gray-100 dark:disabled:bg-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 disabled:text-gray-500 dark:disabled:text-slate-400 outline-none focus:border-brand-light focus:ring-1"
                      value={medioPagoFacturar === 'EFECTIVO' ? montoRecibidoFacturar : ventaAFacturar.total}
                      onChange={e => setMontoRecibidoFacturar(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button onClick={() => setVentaAFacturar(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleFacturar}
                  disabled={!aperturaCajaId || facturando || (medioPagoFacturar === 'EFECTIVO' && Number(montoRecibidoFacturar) < ventaAFacturar.total)}
                  className="flex-1 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-slate-600 transition-colors shadow-sm"
                >
                  {facturando ? 'Procesando...' : 'Facturar y Cobrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documento de Impresión Dinámico */}
      {documentoImprimir && (() => {
        const v = documentoImprimir.venta;
        const tipoDoc = documentoImprimir.tipo;
        let modo = 'TICKET';
        if (v.cae) modo = fmtFE;
        else if (tipoDoc === 'PRESUPUESTO') modo = fmtPresupuesto;
        else if (tipoDoc === 'REMITO') modo = fmtRemito;
        else if (v.estado === 'ANULADA') modo = fmtNC;

        if (modo === 'TICKET') {
          return <TicketVenta venta={v} />;
        }

        if (v.cae) {
          return <FacturaA4 venta={v} />;
        }

        let tipoD: 'REMITO' | 'PRESUPUESTO' | 'FACTURA' | 'NOTA_CREDITO' | 'TICKET_NO_FISCAL' = 'TICKET_NO_FISCAL';
        if (tipoDoc === 'REMITO') tipoD = 'REMITO';
        else if (tipoDoc === 'PRESUPUESTO') tipoD = 'PRESUPUESTO';
        else if (v.estado === 'ANULADA') tipoD = 'NOTA_CREDITO';

        return <DocumentoA4 venta={v} tipo={tipoD} />;
      })()}
    </div>
  );
};

export default VentasHistorial;
