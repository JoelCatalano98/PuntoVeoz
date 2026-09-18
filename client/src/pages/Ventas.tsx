import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Trash2, User, CreditCard, ShoppingCart, AlertTriangle, Edit2 } from 'lucide-react';
import ClienteModal from '../components/ClienteModal';
import { Link } from 'react-router-dom';

interface VentaItem {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Cliente {
  id: number;
  nombre: string;
}

const Ventas = () => {
  const [items, setItems] = useState<VentaItem[]>([]);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [medioPago, setMedioPago] = useState('EFECTIVO');

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // Estado de Caja
  const [aperturaCajaId, setAperturaCajaId] = useState<number | null>(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);

  const [scanValue, setScanValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [cobrando, setCobrando] = useState(false);

  // Configuración
  const [configImpresion, setConfigImpresion] = useState('PREGUNTAR');

  const scanInputRef = useRef<HTMLInputElement>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);

  // Modal Ticket
  const [showModalTicket, setShowModalTicket] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<any>(null);

  // Edit Manual Quantity
  const [editandoItemIdx, setEditandoItemIdx] = useState<number | null>(null);
  const [editCantidad, setEditCantidad] = useState('');

  const openEditModal = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoItemIdx(idx);
    setEditCantidad(items[idx].cantidad.toString());
  };

  const handleGuardarCantidad = () => {
    const qty = parseInt(editCantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Cantidad inválida');
      return;
    }
    setItems(prev => {
      const newItems = [...prev];
      const updatedItem = { ...newItems[editandoItemIdx!] };
      updatedItem.cantidad = qty;
      updatedItem.subtotal = Number((updatedItem.cantidad * updatedItem.precioUnitario).toFixed(2));
      newItems[editandoItemIdx!] = updatedItem;
      return newItems;
    });
    setEditandoItemIdx(null);
    focusScan();
  };

  // Ref para botones del modal
  const btnSiRef = useRef<HTMLButtonElement>(null);
  const btnNoRef = useRef<HTMLButtonElement>(null);

  // Obtener estado de caja y config al montar
  useEffect(() => {
    const initData = async () => {
      try {
        const [resCaja, resConfig] = await Promise.all([
          api.get('/caja/estado'),
          api.get('/parametros/impresionTicket')
        ]);

        if (resCaja.data.abierta) {
          setAperturaCajaId(resCaja.data.apertura.id);
        } else {
          setAperturaCajaId(null);
        }

        if (resConfig.data?.valor) {
          setConfigImpresion(resConfig.data.valor);
        }
      } catch (err) {
        toast.error('Error al inicializar la terminal');
      } finally {
        setCargandoCaja(false);
      }
    };
    initData();
  }, []);

  // Autofocus continuo pero sin romper selects
  useEffect(() => {
    if (aperturaCajaId && !showClienteModal && !showModalTicket && document.activeElement !== montoInputRef.current && document.activeElement?.tagName !== 'SELECT') {
      scanInputRef.current?.focus();
    }
  }, [items, showClienteModal, showModalTicket, aperturaCajaId]);

  // Manejo de foco en el modal de ticket
  useEffect(() => {
    if (showModalTicket) {
      setTimeout(() => btnSiRef.current?.focus(), 50);
    }
  }, [showModalTicket]);

  const handleTicketKeydown = (e: React.KeyboardEvent, isSi: boolean) => {
    if (e.key === 'ArrowRight' && isSi) {
      btnNoRef.current?.focus();
    } else if (e.key === 'ArrowLeft' && !isSi) {
      btnSiRef.current?.focus();
    }
  };

  const focusScan = () => {
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 50);
  };

  const updateCantidad = (index: number, delta: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const newQty = newItems[index].cantidad + delta;
      if (newQty <= 0) return newItems;

      newItems[index].cantidad = newQty;
      newItems[index].subtotal = Number((newQty * newItems[index].precioUnitario).toFixed(2));
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(prev => (prev >= items.length - 1 ? items.length - 2 : prev));
  };

  const total = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));

  // Manejo de pago
  const esEfectivo = medioPago === 'EFECTIVO';
  const montoRecibidoNum = esEfectivo ? (Number(montoRecibido) || 0) : total;
  const canSubmit = items.length > 0 && montoRecibidoNum >= total && !cobrando;

  // Procesar escaneo inteligente
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue.trim()) return;

    let qty = 1;
    let code = scanValue.trim();

    const match = code.match(/^(\d+)[*xX](.+)$/);
    if (match) {
      qty = parseInt(match[1], 10);
      code = match[2];
    }

    try {
      const res = await api.get(`/productos/codigo/${code}`);
      const prod = res.data;

      setItems(prev => {
        const existingIdx = prev.findIndex(i => i.productoId === prod.id);
        if (existingIdx >= 0) {
          const newItems = [...prev];
          const updatedItem = { ...newItems[existingIdx] };
          updatedItem.cantidad += qty;
          updatedItem.subtotal = Number((updatedItem.cantidad * updatedItem.precioUnitario).toFixed(2));
          newItems[existingIdx] = updatedItem;
          return newItems;
        } else {
          const newItem = {
            productoId: prod.id,
            nombre: prod.nombre,
            cantidad: qty,
            precioUnitario: Number(prod.precioVenta),
            subtotal: Number((qty * prod.precioVenta).toFixed(2))
          };
          return [...prev, newItem];
        }
      });
      setSelectedIndex(items.findIndex(i => i.productoId === prod.id) >= 0 ? items.findIndex(i => i.productoId === prod.id) : items.length);
      setScanValue('');
    } catch (err: any) {
      toast.error('Producto no encontrado');
      setScanValue('');
    }
  };

  const limpiarPOS = () => {
    setItems([]);
    setMontoRecibido('');
    setMedioPago('EFECTIVO');
    setCliente(null);
    setSelectedIndex(-1);
    setScanValue('');
    focusScan();
  };

  // Enviar Venta a la API
  const handleCobrar = async () => {
    if (!canSubmit) return;
    if (!aperturaCajaId) {
      toast.error('No hay caja abierta');
      return;
    }

    setCobrando(true);
    try {
      const payload = {
        items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
        montoRecibido: montoRecibidoNum,
        medioPago,
        clienteId: cliente?.id || null,
        aperturaCajaId
      };

      const res = await api.post('/ventas', payload);

      const vueltoStr = esEfectivo ? Number(res.data.vuelto).toFixed(2) : '0.00';
      toast.success(`Venta registrada con éxito | Vuelto: $${vueltoStr}`, {
        duration: 5000,
        style: { padding: '16px', fontWeight: 'bold', fontSize: '1.1rem' }
      });

      // Armamos un objeto venta enriquecido con el cliente actual local, 
      // ya que el POST no trae el include del cliente (sí los items)
      const ventaImpresion = {
        ...res.data,
        cliente: cliente
      };

      try {
        const { imprimirTicket } = await import('../services/ticket.service');
        if (configImpresion === 'SIEMPRE') {
          imprimirTicket(ventaImpresion);
          limpiarPOS();
        } else if (configImpresion === 'PREGUNTAR') {
          setUltimaVenta(ventaImpresion);
          setShowModalTicket(true);
        } else {
          limpiarPOS();
        }
      } catch (importErr) {
        console.error('Error al cargar ticket.service', importErr);
        limpiarPOS();
      }

    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || 'Error procesando la venta');
    } finally {
      setCobrando(false);
    }
  };

  const handleDecisionTicket = (imprimir: boolean) => {
    if (imprimir && ultimaVenta) {
      import('../services/ticket.service').then(({ imprimirTicket }) => {
        imprimirTicket(ultimaVenta);
      });
    }
    setShowModalTicket(false);
    setUltimaVenta(null);
    limpiarPOS();
  };

  if (cargandoCaja) {
    return <div className="h-full flex items-center justify-center text-gray-500 font-medium">Verificando estado de caja...</div>;
  }

  if (!aperturaCajaId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 max-w-lg w-full flex flex-col items-center">
          <AlertTriangle size={80} className="text-orange-500 mb-6 opacity-80" />
          <h2 className="text-3xl font-extrabold text-gray-800 mb-3 tracking-tight">CAJA CERRADA</h2>
          <p className="text-gray-500 mb-8 text-lg leading-relaxed">
            Por favor, abrí tu turno en el módulo de Caja para poder registrar ventas y cobrar.
          </p>
          <Link
            to="/caja"
            className="w-full bg-brand-light text-brand-dark px-8 py-4 rounded-xl font-bold text-lg shadow-sm hover:shadow-md hover:bg-blue-400 transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
          >
            <CreditCard size={24} /> Ir a Apertura de Caja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-row">
      {/* COLUMNA IZQ: Carrito */}
      <div className="flex-1 flex flex-col border-r border-gray-200">

        {/* Buscador / Escáner */}
        <div className="p-4 bg-white shadow-sm z-10">
          <form onSubmit={handleScan} className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Escanear código (ej: 779089... o 3*779...)"
              className="w-full pl-10 pr-4 py-3 text-lg border-2 border-brand-light rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-shadow"
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  montoInputRef.current?.focus();
                  return;
                }

                // Atajos si el input está vacío
                if (scanValue === '') {
                  if (items.length === 0) return;

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                  } else if (e.key === '+' && selectedIndex >= 0) {
                    e.preventDefault();
                    updateCantidad(selectedIndex, 1);
                  } else if (e.key === '-' && selectedIndex >= 0) {
                    e.preventDefault();
                    updateCantidad(selectedIndex, -1);
                  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex >= 0) {
                    e.preventDefault();
                    removeItem(selectedIndex);
                  }
                }
              }}
            />
          </form>
        </div>

        {/* Tabla (Scroll independiente) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ShoppingCart size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg">El carrito está vacío</p>
                <p className="text-sm">Escaneá un producto para comenzar</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-gray-600 font-semibold">Producto</th>
                  <th className="p-3 text-gray-600 font-semibold text-center w-24">Cant.</th>
                  <th className="p-3 text-gray-600 font-semibold text-right w-32">Precio Unit.</th>
                  <th className="p-3 text-gray-600 font-semibold text-right w-32">Subtotal</th>
                  <th className="p-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-100 transition-colors cursor-default ${selectedIndex === idx ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                    onClick={() => { setSelectedIndex(idx); focusScan(); }}
                  >
                    <td className="p-3 font-medium text-gray-800">{item.nombre}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{item.cantidad}</td>
                    <td className="p-3 text-right text-gray-600">${item.precioUnitario.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-brand-dark">${item.subtotal.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => openEditModal(idx, e)}
                        className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"
                        title="Editar Cantidad"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(idx); focusScan(); }}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                        title="Eliminar (Supr)"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* COLUMNA DER: Cobro */}
      <div className="w-[550px] bg-white flex flex-col shadow-[rgba(0,0,0,0.05)_-4px_0_10px]">
        <div className="p-6 bg-brand-dark text-white flex flex-col items-end border-b-4 border-brand-light">
          <div className="text-brand-light/80 text-sm font-semibold uppercase tracking-wider mb-1">Total a cobrar</div>
          <div className="text-5xl font-bold">${total.toFixed(2)}</div>
        </div>

        <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">

          {/* Fila Cliente */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase mb-2">
              <User size={16} /> Cliente
            </label>
            <div className="flex border rounded overflow-hidden focus-within:border-brand-light focus-within:ring-1 focus-within:ring-brand-light">
              <div className="flex-1 p-3 bg-gray-50 text-gray-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {cliente ? cliente.nombre : 'Consumidor Final'}
              </div>
              <button
                onClick={() => setShowClienteModal(true)}
                className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors border-l"
              >
                Cambiar
              </button>
            </div>
          </div>

          {/* Medio de Pago */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase mb-2">
              <CreditCard size={16} /> Medio de pago
            </label>
            <select
              value={medioPago}
              onChange={e => { setMedioPago(e.target.value); }}
              className="w-full p-3 border rounded font-medium text-gray-800 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white cursor-pointer"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA_DEBITO">Tarjeta Débito</option>
              <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="QR">Mercado Pago / QR</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          {/* Input Monto & Info Vuelto */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Monto Recibido</label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xl ${esEfectivo ? 'text-gray-500' : 'text-gray-300'}`}>$</span>
              <input
                ref={montoInputRef}
                type="number"
                min="0"
                step="0.01"
                disabled={!esEfectivo}
                className="w-full p-3 pl-8 text-2xl font-bold border rounded focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-right bg-white disabled:bg-gray-100 disabled:text-gray-400"
                value={esEfectivo ? montoRecibido : total.toFixed(2)}
                onChange={e => setMontoRecibido(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape' || (e.key === 'Tab' && e.shiftKey)) {
                    e.preventDefault();
                    focusScan();
                    return;
                  }
                  if (e.key === 'Enter' && canSubmit) {
                    e.preventDefault();
                    handleCobrar();
                  }
                }}
              />
            </div>

            <div className="mt-4 flex justify-between items-center">
              <span className="font-bold text-gray-600">Vuelto:</span>
              {esEfectivo ? (
                montoRecibidoNum >= total && total > 0 ? (
                  <span className="text-2xl font-bold text-green-600">${(montoRecibidoNum - total).toFixed(2)}</span>
                ) : montoRecibidoNum > 0 && montoRecibidoNum < total ? (
                  <span className="text-lg font-bold text-red-500">Falta ${(total - montoRecibidoNum).toFixed(2)}</span>
                ) : (
                  <span className="text-xl font-bold text-gray-400">$0.00</span>
                )
              ) : (
                <span className="text-xl font-bold text-gray-400">$0.00</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCobrar}
            disabled={!canSubmit}
            className={`w-full py-4 text-xl font-bold rounded-lg uppercase tracking-wider transition-all
              ${!canSubmit
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-md'
              }
            `}
          >
            {cobrando ? 'Procesando...' : 'Cobrar (Enter)'}
          </button>
        </div>
      </div>

      {showClienteModal && (
        <ClienteModal
          onClose={() => setShowClienteModal(false)}
          onSelect={(c) => {
            setCliente(c);
            setShowClienteModal(false);
          }}
        />
      )}

      {/* Modal Editar Cantidad */}
      {editandoItemIdx !== null && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Editar Cantidad</h2>
            <p className="text-gray-600 mb-4">{items[editandoItemIdx]?.nombre}</p>
            <input
              autoFocus
              type="number"
              min="1"
              className="w-full p-3 border-2 border-brand-light rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-xl font-bold text-center mb-6"
              value={editCantidad}
              onChange={e => setEditCantidad(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleGuardarCantidad();
                if (e.key === 'Escape') {
                  setEditandoItemIdx(null);
                  focusScan();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditandoItemIdx(null);
                  focusScan();
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarCantidad}
                className="flex-1 py-3 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-400 transition-colors shadow-md"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ticket Preguntar */}
      {showModalTicket && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-50 text-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🖨️</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Imprimir ticket?</h2>
              <p className="text-gray-500 mb-6">El cobro se realizó correctamente.</p>

              <div className="flex gap-3">
                <button
                  ref={btnNoRef}
                  onKeyDown={(e) => handleTicketKeydown(e, false)}
                  onClick={() => handleDecisionTicket(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors focus:ring-4 focus:ring-gray-300 outline-none"
                >
                  NO
                </button>
                <button
                  ref={btnSiRef}
                  onKeyDown={(e) => handleTicketKeydown(e, true)}
                  onClick={() => handleDecisionTicket(true)}
                  className="flex-1 py-3 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-400 transition-colors shadow-md focus:ring-4 focus:ring-brand-light/50 outline-none"
                >
                  SÍ (Enter)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
