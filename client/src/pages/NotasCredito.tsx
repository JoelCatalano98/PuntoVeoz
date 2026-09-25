import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCcw, Printer, Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Pagination } from '../components/Pagination';
import { TicketVenta } from '../components/TicketVenta';
import { FacturaA4 } from '../components/FacturaA4';
import { Link } from 'react-router-dom';

interface VentaOriginal {
  id: number;
  nroFactura: number;
  puntoVentaId: number;
  tipoComprobante: string;
}

interface NotaCredito {
  id: number;
  total: number;
  cliente?: { nombre: string; razonSocial?: string; numeroDoc?: string };
  usuario: { nombre: string };
  createdAt: string;
  nroFactura: number;
  cae: string;
  tipoComprobante: string;
  puntoVenta: { numero: number };
  ventaOriginal?: VentaOriginal;
  items: any[];
}

const NotasCredito: React.FC = () => {
  const [notas, setNotas] = useState<NotaCredito[]>([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  const [documentoImprimir, setDocumentoImprimir] = useState<{ venta: NotaCredito, tipo: 'NOTA_CREDITO' } | null>(null);
  
  // Parámetros de impresión y empresa para el documento
  const [fmtNC, setFmtNC] = useState('TICKET');
  const [empresaDatos, setEmpresaDatos] = useState({ razonSocial: '', cuit: '', direccion: '', condicionIva: '' });

  const cargarNotas = async (pagina = page) => {
    setCargando(true);
    try {
      const params: any = { page: pagina, limit: 50 };
      if (fechaDesde && fechaHasta) {
        params.fechaDesde = fechaDesde;
        params.fechaHasta = fechaHasta;
      }

      const [resNotas, resRS, resCuit, resDir, resIva, resNCParam] = await Promise.all([
        api.get('/ventas/notas-credito', { params }),
        api.get('/parametros/empresaRazonSocial'),
        api.get('/parametros/empresaCuit'),
        api.get('/parametros/empresaDireccion'),
        api.get('/parametros/empresaCondicionIva'),
        api.get('/parametros/impresionNotaCredito')
      ]);

      setNotas(resNotas.data.data);
      setTotalPages(resNotas.data.totalPages);
      setTotalCount(resNotas.data.totalCount);
      setPage(pagina);

      setEmpresaDatos({
        razonSocial: resRS.data?.valor || 'Empresa / Comercio',
        cuit: resCuit.data?.valor || '',
        direccion: resDir.data?.valor || '',
        condicionIva: resIva.data?.valor || ''
      });

      if (resNCParam.data?.valor) setFmtNC(resNCParam.data.valor);

    } catch (error) {
      toast.error('Error al cargar Notas de Crédito');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNotas(1);
  }, [fechaDesde, fechaHasta]);

  const imprimirDocumento = (venta: NotaCredito, esPdf = false) => {
    setDocumentoImprimir({ venta, tipo: 'NOTA_CREDITO' });
    if (esPdf) {
      toast.success('En la siguiente ventana emergente, selecciona "Guardar como PDF" como Destino.', { duration: 4000 });
    }
    setTimeout(() => {
      window.print();
      setDocumentoImprimir(null);
    }, 500);
  };

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-200 print:p-0 print:bg-white print:h-auto print:block">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-brand-light">Notas de Crédito</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Historial de comprobantes de anulación fiscales</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => cargarNotas()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCcw size={18} /> Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col flex-1 overflow-hidden transition-colors duration-200 print:hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center transition-colors">
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="flex gap-2 items-center">
              <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="text-sm text-brand-dark hover:text-brand-light font-medium transition-colors ml-2"
              >
                Limpiar fechas
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 dark:text-slate-500 text-sm border-b border-gray-100 dark:border-slate-700">
                <th className="pb-3 font-semibold">Fecha</th>
                <th className="pb-3 font-semibold">Nota de Crédito</th>
                <th className="pb-3 font-semibold">CAE</th>
                <th className="pb-3 font-semibold">Comprobante Original</th>
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold text-right">Total</th>
                <th className="pb-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-slate-400">
                    Cargando notas de crédito...
                  </td>
                </tr>
              ) : notas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-slate-400">
                    No se encontraron notas de crédito.
                  </td>
                </tr>
              ) : (
                notas.map((nc) => {
                  let letraNC = nc.tipoComprobante?.replace('NOTA_CREDITO_', '') || 'C';
                  
                  return (
                    <tr key={nc.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 text-gray-600 dark:text-slate-300">
                        {format(new Date(nc.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </td>
                      <td className="py-4 text-gray-900 dark:text-slate-200">
                        <span className="font-bold">NC "{letraNC}"</span>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          Nº {String(nc.puntoVenta?.numero || 1).padStart(4, '0')}-{String(nc.nroFactura || nc.id).padStart(8, '0')}
                        </div>
                      </td>
                      <td className="py-4 text-gray-600 dark:text-slate-300 font-mono">
                        {nc.cae}
                      </td>
                      <td className="py-4 text-gray-600 dark:text-slate-300">
                        {nc.ventaOriginal ? (
                          <div className="flex flex-col">
                            <span className="text-xs">
                              {nc.ventaOriginal.tipoComprobante.replace('_', ' ')}
                            </span>
                            <span className="font-bold">
                              Nº {String(nc.ventaOriginal.puntoVentaId || 1).padStart(4, '0')}-{String(nc.ventaOriginal.nroFactura || nc.ventaOriginal.id).padStart(8, '0')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Desconocida</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-gray-900 dark:text-slate-200">
                          {nc.cliente?.razonSocial || nc.cliente?.nombre || 'Consumidor Final'}
                        </div>
                        {nc.cliente?.numeroDoc && (
                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {nc.cliente.numeroDoc}
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span className="font-bold text-gray-900 dark:text-slate-200">
                          ${Number(nc.total).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => imprimirDocumento(nc)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 p-1.5 rounded" title="Imprimir NC">
                            <Printer size={16} />
                          </button>
                          <button onClick={() => imprimirDocumento(nc, true)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded" title="Guardar como PDF">
                            <Download size={16} />
                          </button>
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
          onPageChange={(newPage) => cargarNotas(newPage)}
        />
      </div>

      {/* Documento de Impresión Dinámico */}
      {documentoImprimir && (() => {
        const v = documentoImprimir.venta;
        
        if (fmtNC === 'TICKET') {
          return <TicketVenta venta={v as any} />;
        } else {
          return <FacturaA4 venta={v as any} />;
        }
      })()}
    </div>
  );
};

export default NotasCredito;
