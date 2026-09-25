import React, { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, CheckCircle, RefreshCcw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface NuevaNotaCreditoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VentaElegible {
  id: number;
  createdAt: string;
  total: number;
  nroFactura?: number;
  tipoComprobante?: string;
  cliente?: { nombre: string; razonSocial?: string } | null;
  puntoVenta?: { numero: number };
  items: any[];
}

export const NuevaNotaCreditoModal: React.FC<NuevaNotaCreditoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [ventas, setVentas] = useState<VentaElegible[]>([]);
  const [cargando, setCargando] = useState(false);
  const [seleccionada, setSeleccionada] = useState<VentaElegible | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarElegibles();
      setSeleccionada(null);
    }
  }, [isOpen]);

  const cargarElegibles = async () => {
    try {
      setCargando(true);
      const res = await api.get('/ventas/elegibles-nc');
      setVentas(res.data);
    } catch (error) {
      toast.error('Error al cargar facturas elegibles');
    } finally {
      setCargando(false);
    }
  };

  const calcularDias = (fecha: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(fecha).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleEmitir = async () => {
    if (!seleccionada) return;
    try {
      setEmitiendo(true);
      await api.post(`/ventas/${seleccionada.id}/nota-credito`);
      toast.success('Nota de Crédito emitida con éxito');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al emitir Nota de Crédito');
    } finally {
      setEmitiendo(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors duration-200 border border-gray-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="bg-brand-dark text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <RefreshCcw size={20} />
            <h2 className="text-xl font-bold">
              {seleccionada ? 'Confirmar Nota de Crédito' : 'Seleccionar Factura a Anular'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
          {!seleccionada ? (
            cargando ? (
              <div className="text-center py-10 text-gray-500">Cargando facturas...</div>
            ) : ventas.length === 0 ? (
              <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                <FileText size={48} className="mb-4 text-gray-300" />
                No hay facturas elegibles (con CAE y sin NC previa).
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                      <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Comprobante</th>
                      <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                      <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Total</th>
                      <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado</th>
                      <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {ventas.map(v => {
                      const dias = calcularDias(v.createdAt);
                      const isVencida = dias > 15;
                      const nombreCmp = v.tipoComprobante?.replace('FACTURA_', 'FACTURA ') || 'FACTURA';
                      const nroFormateado = `${String(v.puntoVenta?.numero || 1).padStart(4, '0')}-${String(v.nroFactura || v.id).padStart(8, '0')}`;

                      return (
                        <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-3 text-sm text-gray-800 dark:text-slate-200 whitespace-nowrap">
                            {new Date(v.createdAt).toLocaleDateString('es-AR')}
                            <span className="block text-xs text-gray-500">hace {dias} días</span>
                          </td>
                          <td className="p-3 text-sm font-mono text-gray-600 dark:text-slate-400">
                            <span className="font-bold text-gray-800 dark:text-slate-200">{nombreCmp}</span>
                            <br />
                            N° {nroFormateado}
                          </td>
                          <td className="p-3 text-sm text-gray-800 dark:text-slate-200">
                            {v.cliente?.razonSocial || v.cliente?.nombre || 'Consumidor Final'}
                          </td>
                          <td className="p-3 text-sm font-bold text-brand-dark dark:text-brand-light text-right whitespace-nowrap">
                            ${Number(v.total).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            {isVencida ? (
                              <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                                Vencida ({'>'}15 días)
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                                Válida
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              disabled={isVencida}
                              onClick={() => setSeleccionada(v)}
                              className="px-3 py-1.5 bg-brand-light text-brand-dark font-bold rounded hover:bg-brand-light/80 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-colors text-sm"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 text-brand-dark dark:text-brand-light mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                  <AlertCircle size={28} />
                  <div>
                    <h3 className="text-lg font-bold">Resumen de Anulación</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Verificá los datos antes de emitir a AFIP</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-800 dark:text-slate-200">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-500">Factura Original:</span>
                    <span className="font-mono">{seleccionada.tipoComprobante?.replace('FACTURA_', '')} {String(seleccionada.puntoVenta?.numero || 1).padStart(4, '0')}-{String(seleccionada.nroFactura || seleccionada.id).padStart(8, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-500">Punto de Venta Original:</span>
                    <span className="font-bold">{seleccionada.puntoVenta?.numero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-500">Cliente:</span>
                    <span className="font-bold">{seleccionada.cliente?.razonSocial || seleccionada.cliente?.nombre || 'Consumidor Final'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-500">Fecha Emisión:</span>
                    <span>{new Date(seleccionada.createdAt).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-slate-700 mt-3">
                    <span className="text-lg font-bold">Total a Devolver:</span>
                    <span className="text-2xl font-black text-brand-dark dark:text-brand-light">${Number(seleccionada.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 shrink-0">
          {seleccionada && (
            <button
              onClick={() => setSeleccionada(null)}
              disabled={emitiendo}
              className="px-6 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Volver Atrás
            </button>
          )}
          
          <button
            onClick={seleccionada ? handleEmitir : onClose}
            disabled={emitiendo || (!seleccionada && cargando)}
            className={`px-6 py-2 font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 ${
              seleccionada 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {seleccionada ? (
              <>
                {emitiendo ? <RefreshCcw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {emitiendo ? 'Emitiendo AFIP...' : 'Emitir Nota de Crédito'}
              </>
            ) : (
              'Cerrar'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
