import React, { useState, useEffect } from 'react';
import { FileText, Search, User, Edit2, CheckCircle, Plus, Trash2, Printer, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ClienteModal from '../components/ClienteModal';
import { FacturaA4 } from '../components/FacturaA4';
import { TicketVenta } from '../components/TicketVenta';
import ConfirmacionEmision from '../components/ConfirmacionEmision';

export default function Facturacion() {
  const [loading, setLoading] = useState(false);
  const [facturando, setFacturando] = useState(false);
  const [facturaEmitida, setFacturaEmitida] = useState(false);
  const [dataFactura, setDataFactura] = useState<any>(null);
  const [formatoFE, setFormatoFE] = useState('A4');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Cliente
  const [cliente, setCliente] = useState<any>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // Fiscal
  const [puntosVenta, setPuntosVenta] = useState<any[]>([]);
  const [puntoVentaId, setPuntoVentaId] = useState<string>('');
  const [concepto, setConcepto] = useState<number>(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Items
  const [items, setItems] = useState<any[]>([]);
  const [ventaBaseId, setVentaBaseId] = useState<number | null>(null);

  // Caja
  const [aperturaCajaId, setAperturaCajaId] = useState<number | null>(null);

  // Modal Tickets Previos
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    cargarPuntosVenta();
    cargarCaja();
    
    // Set default dates to today (YYYYMMDD format for ARCA)
    const today = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');
    setFechaDesde(today);
    setFechaHasta(today);
    
    // Cargar config impresión
    api.get('/parametros/impresionFacturaElectronica').then(res => {
      if (res.data?.valor) setFormatoFE(res.data.valor);
    }).catch(err => console.error('Error al cargar config impresion', err));
  }, []);

  const cargarCaja = async () => {
    try {
      const res = await api.get('/caja/estado');
      if (res.data && res.data.abierta) {
        setAperturaCajaId(res.data.apertura.id);
      }
    } catch (err) {
      console.error('Error al cargar estado de caja', err);
    }
  };

  const cargarPuntosVenta = async () => {
    try {
      const res = await api.get('/arca/puntos-venta');
      const validPuntos = res.data.filter((pv: any) => pv.tipo === 'WEBSERVICE');
      setPuntosVenta(validPuntos);
      if (validPuntos.length > 0) setPuntoVentaId(validPuntos[0].id.toString());
    } catch (err) {
      toast.error('Error al cargar puntos de venta. Revise sus permisos o conexión.');
    }
  };

  const cargarTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ventas/historial?sinCae=true&limit=50');
      setTickets(res.data.data || []);
      setShowTicketsModal(true);
    } catch (err) {
      toast.error('Error al cargar tickets previos');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarTicket = (ticket: any) => {
    setVentaBaseId(ticket.id);
    if (ticket.cliente) setCliente(ticket.cliente);
    setItems(ticket.items.map((i: any) => ({
      productoId: i.productoId,
      descripcion: i.descripcion || i.producto?.nombre,
      cantidad: i.cantidad,
      precio: i.precioUnitario,
      subtotal: i.subtotal
    })));
    setShowTicketsModal(false);
  };

  const agregarItemLibre = () => {
    if (ventaBaseId) {
      toast.error('No se pueden agregar ítems si estás facturando un ticket previo.');
      return;
    }
    setItems([...items, { productoId: null, descripcion: 'Honorarios / Servicio', cantidad: 1, precio: 0, subtotal: 0 }]);
  };

  const actualizarItem = (idx: number, campo: string, valor: any) => {
    const newItems = [...items];
    newItems[idx][campo] = valor;
    if (campo === 'cantidad' || campo === 'precio') {
      newItems[idx].subtotal = Number((newItems[idx].cantidad * newItems[idx].precio).toFixed(2));
    }
    setItems(newItems);
  };

  const eliminarItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const limpiar = () => {
    setFacturaEmitida(false);
    setDataFactura(null);
    setCliente(null);
    setItems([]);
    setVentaBaseId(null);
    setConcepto(1);
  };

  const handleEmitir = async () => {
    if (!cliente || !cliente.numeroDoc) {
      toast.error('Debe seleccionar un cliente con DNI/CUIT.');
      return;
    }
    if (items.length === 0) {
      toast.error('La factura debe tener al menos un ítem.');
      return;
    }
    if (!ventaBaseId && !aperturaCajaId) {
      toast.error('No hay una caja abierta para registrar la venta.');
      return;
    }

    setShowConfirmModal(true);
  };

  const ejecutarEmision = async () => {
    setShowConfirmModal(false);
    setFacturando(true);
    try {
      let vId = ventaBaseId;
      let esVentaNueva = false;

      // 1. Si no hay venta base, crearla como presupuesto/completada para que el backend la registre
      if (!vId) {
        const payloadVenta = {
          items: items.map(i => ({ 
            productoId: i.productoId || null,
            cantidad: Number(i.cantidad),
            precioUnitario: Number(i.precio),
            descripcion: i.descripcion,
            descuentoLinea: 0
          })),
          montoRecibido: items.reduce((acc, i) => acc + i.subtotal, 0),
          medioPago: 'OTRO',
          clienteId: cliente.id,
          aperturaCajaId: aperturaCajaId,
          descuentoGlobal: 0,
          estado: 'COMPLETADA'
        };
        console.log("Payload a enviar:", payloadVenta);
        const resVenta = await api.post('/ventas', payloadVenta);
        vId = resVenta.data.id;
        esVentaNueva = true;
      }

      // 2. Llamar a AFIP
      const payloadAfip = {
        clienteId: cliente.id,
        concepto: concepto,
        fechaServicioDesde: concepto > 1 ? fechaDesde : undefined,
        fechaServicioHasta: concepto > 1 ? fechaHasta : undefined,
        vtoPago: concepto > 1 ? fechaHasta : undefined,
        esVentaNueva: esVentaNueva
      };

      try {
        const resAfip = await api.post(`/ventas/${vId}/facturar-afip`, payloadAfip);
        toast.success('¡Factura emitida correctamente en ARCA!');
        setDataFactura({ ...resAfip.data, cliente });
        setFacturaEmitida(true);
      } catch (err: any) {
        throw err;
      }

    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Error al emitir la factura');
    } finally {
      setFacturando(false);
    }
  };

  const total = items.reduce((acc, i) => acc + Number(i.subtotal), 0);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 transition-colors duration-200 print:h-auto print:block">
      
      {/* HEADER PRINCIPAL */}
      <div className="p-3 border-b border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-brand-dark dark:text-brand-light" />
          <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wide">Facturación AFIP</h1>
          {ventaBaseId && <span className="ml-2 bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold px-2 py-1 rounded-sm">De Ticket #{ventaBaseId}</span>}
        </div>
        <div>
          {facturaEmitida ? (
            <button onClick={limpiar} className="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-bold border border-gray-400 rounded-sm">
              Nueva Factura
            </button>
          ) : (
            <button onClick={cargarTickets} className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-sm font-bold flex items-center gap-2 border border-gray-900 rounded-sm">
              <Search size={14} /> Facturar Ticket Previo
            </button>
          )}
        </div>
      </div>

      {/* PANEL DE CONFIGURACIÓN COMPACTO */}
      <div className="p-4 border-b border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 print:hidden">
        <div className="grid grid-cols-12 gap-6">
          
          {/* CLIENTE */}
          <div className="col-span-5 flex flex-col gap-2 border-r border-gray-300 dark:border-slate-600 pr-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Datos del Cliente</span>
              {!facturaEmitida && (
                <button onClick={() => setShowClienteModal(true)} className="text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 hover:underline">
                  <Search size={12} /> Buscar Cliente
                </button>
              )}
            </div>
            {cliente ? (
              <div className="bg-white dark:bg-slate-900 p-3 border border-gray-300 dark:border-slate-600 rounded-sm flex flex-col gap-1">
                <div className="font-bold text-sm text-gray-800 dark:text-slate-200">{cliente.nombre} {cliente.razonSocial ? `(${cliente.razonSocial})` : ''}</div>
                <div className="text-xs text-gray-600 dark:text-slate-400">CUIT/DNI: <span className="font-bold">{cliente.numeroDoc || 'NO CARGADO'}</span></div>
                <div className="text-xs text-gray-600 dark:text-slate-400">Condición: <span className="font-bold">{cliente.condicionIva || 'Consumidor Final'}</span></div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-4 border border-dashed border-gray-400 dark:border-slate-600 rounded-sm text-center text-gray-500 text-sm">
                Seleccione un cliente para facturar
              </div>
            )}
          </div>

          {/* FISCAL */}
          <div className="col-span-7 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">Opciones Fiscales</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Punto de Venta</label>
                <select 
                  disabled={facturaEmitida}
                  value={puntoVentaId}
                  onChange={e => setPuntoVentaId(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {puntosVenta.filter(pv => pv.tipo === 'WEBSERVICE').map(pv => {
                    const labelStr = pv.numero ? `${pv.numero} - ${pv.descripcion || pv.nombre || ''}` : (pv.nombre || pv.descripcion || `PV #${pv.id}`);
                    return <option key={pv.id} value={pv.id}>{labelStr}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Concepto</label>
                <select 
                  disabled={facturaEmitida}
                  value={concepto}
                  onChange={e => setConcepto(Number(e.target.value))}
                  className="w-full p-2 text-sm border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value={1}>Bienes (1)</option>
                  <option value={2}>Servicios (2)</option>
                  <option value={3}>Bienes y Servicios (3)</option>
                </select>
              </div>
              
              {concepto > 1 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Fecha Desde (Servicios)</label>
                    <input 
                      disabled={facturaEmitida}
                      type="text" 
                      value={fechaDesde} 
                      onChange={e => setFechaDesde(e.target.value)}
                      placeholder="YYYYMMDD"
                      className="w-full p-2 text-sm border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Fecha Hasta (Servicios)</label>
                    <input 
                      disabled={facturaEmitida}
                      type="text" 
                      value={fechaHasta} 
                      onChange={e => setFechaHasta(e.target.value)}
                      placeholder="YYYYMMDD"
                      className="w-full p-2 text-sm border border-gray-400 dark:border-slate-600 rounded-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* TABLA DE DETALLES */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col bg-gray-50 dark:bg-slate-900 print:hidden">
        <div className="flex justify-between items-center p-3 border-b border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200 uppercase">Líneas de Factura</h2>
          {!facturaEmitida && !ventaBaseId && (
            <button 
              onClick={agregarItemLibre}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold border border-gray-400 rounded-sm flex items-center gap-1"
            >
              <Plus size={14} /> Fila Manual
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
            <FileText size={48} className="mb-2 opacity-30" />
            <p className="text-sm">La tabla está vacía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-200 dark:bg-slate-800 border-b border-gray-400 dark:border-slate-600">
                <tr>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold w-12 text-center">#</th>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold">Descripción</th>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold w-24 text-center">Cant.</th>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold w-32 text-right">P. Unitario</th>
                  <th className="p-2 border-r border-gray-300 dark:border-slate-700 font-bold w-32 text-right">Subtotal</th>
                  {!facturaEmitida && !ventaBaseId && <th className="p-2 w-12 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-slate-700 hover:bg-yellow-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-900">
                    <td className="p-2 border-r border-gray-200 dark:border-slate-700 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="p-1 border-r border-gray-200 dark:border-slate-700">
                      <input 
                        disabled={facturaEmitida || !!ventaBaseId}
                        type="text" 
                        value={item.descripcion}
                        onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                        className="w-full p-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded-sm focus:outline-none focus:bg-white dark:focus:bg-slate-800 disabled:hover:border-transparent text-sm"
                      />
                    </td>
                    <td className="p-1 border-r border-gray-200 dark:border-slate-700">
                      <input 
                        disabled={facturaEmitida || !!ventaBaseId}
                        type="number" 
                        value={item.cantidad}
                        onChange={e => actualizarItem(idx, 'cantidad', Number(e.target.value))}
                        className="w-full p-1 text-center bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded-sm focus:outline-none focus:bg-white dark:focus:bg-slate-800 disabled:hover:border-transparent text-sm"
                      />
                    </td>
                    <td className="p-1 border-r border-gray-200 dark:border-slate-700">
                      <input 
                        disabled={facturaEmitida || !!ventaBaseId}
                        type="number" 
                        step="0.01"
                        value={item.precio}
                        onChange={e => actualizarItem(idx, 'precio', Number(e.target.value))}
                        className="w-full p-1 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded-sm focus:outline-none focus:bg-white dark:focus:bg-slate-800 disabled:hover:border-transparent text-sm"
                      />
                    </td>
                    <td className="p-2 border-r border-gray-200 dark:border-slate-700 text-right font-bold text-brand-dark dark:text-brand-light">
                      ${Number(item.subtotal).toFixed(2)}
                    </td>
                    {!facturaEmitida && !ventaBaseId && (
                      <td className="p-1 text-center">
                        <button onClick={() => eliminarItem(idx)} className="p-1 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded-sm">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER TOTAL Y ACCIÓN */}
      <div className="p-4 border-t border-gray-300 dark:border-slate-700 bg-gray-200 dark:bg-slate-800 flex justify-between items-center h-20 print:hidden">
        <div className="text-2xl font-black text-gray-900 dark:text-white">
          TOTAL: ${total.toFixed(2)}
        </div>
        
        {facturaEmitida ? (
          <button 
            onClick={() => setTimeout(() => window.print(), 200)}
            className="px-8 py-3 bg-green-600 text-white font-bold text-lg border border-green-700 rounded-sm shadow-sm hover:bg-green-700 transition-all flex items-center gap-2 animate-pulse"
          >
            <Printer size={20} /> Imprimir Factura A4
          </button>
        ) : (
          <button 
            disabled={facturando || items.length === 0 || !cliente}
            onClick={handleEmitir}
            className="px-8 py-3 bg-blue-600 text-white font-bold text-lg border border-blue-700 rounded-sm shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {facturando ? (
              <><span className="animate-spin">⌛</span> Emitiendo...</>
            ) : (
              <><CheckCircle size={20} /> Emitir Comprobante AFIP</>
            )}
          </button>
        )}
      </div>

      {showClienteModal && (
        <ClienteModal 
          onClose={() => setShowClienteModal(false)}
          onSelect={(c) => {
            if (c) setCliente(c);
            setShowClienteModal(false);
          }}
          requiereDatosFiscales={true}
        />
      )}

      {showTicketsModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-400 shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col rounded-sm">
            <div className="p-3 border-b border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 uppercase">Seleccionar Ticket Previo</h2>
              <button onClick={() => setShowTicketsModal(false)} className="text-gray-500 hover:text-red-500 font-bold px-2 border border-transparent hover:border-red-500 bg-gray-200 hover:bg-red-100 rounded-sm">X</button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              {loading ? <p className="text-center p-4 text-gray-500 text-sm">Cargando...</p> : 
                tickets.length === 0 ? <p className="text-center p-4 text-gray-500 text-sm">No hay tickets sin facturar.</p> : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-gray-200 dark:bg-slate-700 border-b border-gray-400 dark:border-slate-600">
                    <tr>
                      <th className="p-2 border-r border-gray-300 dark:border-slate-600 font-bold">Nro</th>
                      <th className="p-2 border-r border-gray-300 dark:border-slate-600 font-bold">Fecha</th>
                      <th className="p-2 border-r border-gray-300 dark:border-slate-600 font-bold">Cliente</th>
                      <th className="p-2 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                  {tickets.map(t => (
                    <tr 
                      key={t.id} 
                      onClick={() => seleccionarTicket(t)}
                      className="border-b border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                    >
                      <td className="p-2 border-r border-gray-200 dark:border-slate-700 font-bold">#{t.id}</td>
                      <td className="p-2 border-r border-gray-200 dark:border-slate-700">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="p-2 border-r border-gray-200 dark:border-slate-700">{t.cliente?.nombre || 'Consumidor Final'}</td>
                      <td className="p-2 font-bold text-right text-brand-dark dark:text-brand-light">${Number(t.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render invisible for printing */}
      <div className="hidden">
        {dataFactura && (formatoFE === 'A4' ? <FacturaA4 venta={dataFactura} /> : <TicketVenta venta={dataFactura} />)}
      </div>

      <ConfirmacionEmision
        isOpen={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={ejecutarEmision}
        title="Confirmar Emisión de Factura"
      >
        <div className="space-y-4">
          <p>Vas a emitir una <strong>Factura {cliente?.condicionIva === 'RESPONSABLE_INSCRIPTO' ? 'A' : 'C'}</strong> por <strong>${total.toFixed(2)}</strong> para <strong>{cliente?.razonSocial || cliente?.nombre || 'Consumidor Final'}</strong>.</p>
          <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
            <ul className="text-sm space-y-2">
              <li className="flex justify-between"><span>Cliente:</span> <span className="font-semibold">{cliente?.razonSocial || cliente?.nombre}</span></li>
              <li className="flex justify-between"><span>DNI/CUIT:</span> <span className="font-semibold">{cliente?.numeroDoc}</span></li>
              <li className="flex justify-between"><span>Ítems:</span> <span className="font-semibold">{items.reduce((acc, i) => acc + Number(i.cantidad), 0)}</span></li>
              <li className="flex justify-between text-lg pt-2 border-t border-gray-200 dark:border-slate-700"><span>Total a Facturar:</span> <span className="font-bold text-brand-dark dark:text-brand-light">${total.toFixed(2)}</span></li>
            </ul>
          </div>
          <p className="text-sm text-red-500 dark:text-red-400 mt-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Esta acción no se puede deshacer sin emitir una Nota de Crédito. ¿Confirmar?
          </p>
        </div>
      </ConfirmacionEmision>
    </div>
  );
}
