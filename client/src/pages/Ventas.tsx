import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Trash2, User, CreditCard, ShoppingCart, AlertTriangle, Edit2, Tag, Percent } from 'lucide-react';
import ClienteModal from '../components/ClienteModal';
import { Link } from 'react-router-dom';

interface ListaPrecio {
  id: number;
  nombre: string;
  tipoModificador: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  esPredeterminada: boolean;
}

interface VentaItem {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioBase: number;
  precioLista: number;
  bonificacion: number;
  precioUnitario: number;
  subtotal: number;
}

interface Cliente {
  id: number;
  nombre: string;
}

const calcularPrecioFinal = (precioBase: number, lista: ListaPrecio | null): number => {
  if (!lista) return precioBase;
  const valor = Number(lista.valor);
  if (lista.tipoModificador === 'PORCENTAJE') {
    return precioBase + (precioBase * (valor / 100));
  } else {
    return precioBase + valor;
  }
};

const Ventas = () => {
  const [items, setItems] = useState<VentaItem[]>([]);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [descuentoGlobal, setDescuentoGlobal] = useState('');

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // Estado de Caja
  const [aperturaCajaId, setAperturaCajaId] = useState<number | null>(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);

  // Listas de Precio y Categorías
  const [listasPrecio, setListasPrecio] = useState<ListaPrecio[]>([]);
  const [categoriasLista, setCategoriasLista] = useState<any[]>([]);
  const [listaSeleccionadaId, setListaSeleccionadaId] = useState<string>('');
  const [aplicarLista, setAplicarLista] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [scanValue, setScanValue] = useState('');
  const [productosBuscados, setProductosBuscados] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [cobrando, setCobrando] = useState(false);

  // Configuración
  const [configImpresion, setConfigImpresion] = useState('PREGUNTAR');

  const scanInputRef = useRef<HTMLInputElement>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);

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

  const btnSiRef = useRef<HTMLButtonElement>(null);
  const btnNoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [resCaja, resConfig, resListas, resCat] = await Promise.all([
          api.get('/caja/estado'),
          api.get('/parametros/impresionTicket'),
          api.get('/listas-precio'),
          api.get('/categorias')
        ]);

        if (resCaja.data.abierta) {
          setAperturaCajaId(resCaja.data.apertura.id);
        } else {
          setAperturaCajaId(null);
        }

        if (resConfig.data?.valor) {
          setConfigImpresion(resConfig.data.valor);
        }

        const listas = resListas.data;
        setListasPrecio(listas);
        const listaPredeterminada = listas.find((l: ListaPrecio) => l.esPredeterminada);
        if (listaPredeterminada) {
          setListaSeleccionadaId(listaPredeterminada.id.toString());
        } else if (listas.length > 0) {
          setListaSeleccionadaId(listas[0].id.toString());
        }

        setCategoriasLista(resCat.data);
      } catch (err) {
        toast.error('Error al inicializar la terminal');
      } finally {
        setCargandoCaja(false);
      }
    };
    initData();
  }, []);

  // Recalcular carrito cuando cambia la lista de precios o su activación
  useEffect(() => {
    const listaActiva = aplicarLista ? listasPrecio.find(l => l.id.toString() === listaSeleccionadaId) || null : null;
    
    setItems(prev => prev.map(item => {
      const nuevoPrecioLista = calcularPrecioFinal(item.precioBase, listaActiva);
      const nuevoPrecioUnitario = nuevoPrecioLista * (1 - item.bonificacion / 100);
      
      return {
        ...item,
        precioLista: nuevoPrecioLista,
        precioUnitario: nuevoPrecioUnitario,
        subtotal: Number((nuevoPrecioUnitario * item.cantidad).toFixed(2))
      };
    }));
  }, [listaSeleccionadaId, listasPrecio, aplicarLista]);

  // Búsqueda rápida
  useEffect(() => {
    if (scanValue.trim().length > 1 || filtroCategoria) {
      const delay = setTimeout(async () => {
        try {
          const params = new URLSearchParams();
          if (filtroCategoria) params.append('categoriaId', filtroCategoria);
          if (scanValue.trim()) params.append('busqueda', scanValue.trim());

          const res = await api.get('/productos', { params });
          setProductosBuscados(res.data.slice(0, 15));
        } catch (e) {}
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setProductosBuscados([]);
    }
  }, [scanValue, filtroCategoria]);

  // Manejar clics fuera de los resultados de búsqueda para cerrarlos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultadosRef.current && !resultadosRef.current.contains(event.target as Node) && scanInputRef.current && !scanInputRef.current.contains(event.target as Node)) {
        setProductosBuscados([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (aperturaCajaId && !showClienteModal && !showModalTicket && document.activeElement !== montoInputRef.current && document.activeElement?.tagName !== 'SELECT' && document.activeElement?.tagName !== 'INPUT') {
      scanInputRef.current?.focus();
    }
  }, [items, showClienteModal, showModalTicket, aperturaCajaId, listaSeleccionadaId, aplicarLista, descuentoGlobal]);

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

  const updateBonificacion = (index: number, bonificacion: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      item.bonificacion = Math.max(0, Math.min(100, bonificacion || 0)); // Validar entre 0 y 100
      item.precioUnitario = item.precioLista * (1 - item.bonificacion / 100);
      item.subtotal = Number((item.cantidad * item.precioUnitario).toFixed(2));
      newItems[index] = item;
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(prev => (prev >= items.length - 1 ? items.length - 2 : prev));
  };

  const totalItems = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  const descNum = Number(descuentoGlobal) || 0;
  const total = Math.max(0, Number((totalItems - descNum).toFixed(2)));

  const esEfectivo = medioPago === 'EFECTIVO';
  const montoRecibidoNum = esEfectivo ? (Number(montoRecibido) || 0) : total;
  const canSubmit = items.length > 0 && montoRecibidoNum >= total && !cobrando;

  const agregarProducto = (prod: any, qty: number = 1) => {
    const precioBase = Number(prod.precioVenta);
    const listaActiva = aplicarLista ? listasPrecio.find(l => l.id.toString() === listaSeleccionadaId) || null : null;
    const precioLista = calcularPrecioFinal(precioBase, listaActiva);
    const bonificacionInicial = 0;
    const precioUnitario = precioLista * (1 - bonificacionInicial / 100);

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
        const newItem: VentaItem = {
          productoId: prod.id,
          nombre: prod.nombre,
          cantidad: qty,
          precioBase: precioBase,
          precioLista: precioLista,
          bonificacion: bonificacionInicial,
          precioUnitario: precioUnitario,
          subtotal: Number((qty * precioUnitario).toFixed(2))
        };
        return [...prev, newItem];
      }
    });
    setSelectedIndex(items.findIndex(i => i.productoId === prod.id) >= 0 ? items.findIndex(i => i.productoId === prod.id) : items.length);
  };

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
      agregarProducto(res.data, qty);
      setScanValue('');
      setProductosBuscados([]);
    } catch (err: any) {
      // Si no es un código exacto, la búsqueda rápida lo mostrará, pero no agregamos nada.
      if (productosBuscados.length === 1) {
        // Autoseleccionar si hay solo 1 coincidencia
        agregarProducto(productosBuscados[0], qty);
        setScanValue('');
        setProductosBuscados([]);
      } else if (productosBuscados.length === 0) {
        toast.error('Producto no encontrado');
        setScanValue('');
      } else {
        toast.error('Múltiples resultados, seleccione uno de la lista');
      }
    }
  };

  const limpiarPOS = () => {
    setItems([]);
    setMontoRecibido('');
    setDescuentoGlobal('');
    setMedioPago('EFECTIVO');
    setCliente(null);
    setSelectedIndex(-1);
    setScanValue('');
    setProductosBuscados([]);
    
    // Restablecer a lista predeterminada
    const listaPredeterminada = listasPrecio.find(l => l.esPredeterminada);
    if (listaPredeterminada) {
      setListaSeleccionadaId(listaPredeterminada.id.toString());
    } else if (listasPrecio.length > 0) {
      setListaSeleccionadaId(listasPrecio[0].id.toString());
    } else {
      setListaSeleccionadaId('');
    }
    setAplicarLista(false);

    focusScan();
  };

  const handleCobrar = async () => {
    if (!canSubmit) return;
    if (!aperturaCajaId) {
      toast.error('No hay caja abierta');
      return;
    }

    setCobrando(true);
    try {
      const payload = {
        items: items.map(i => ({ 
          productoId: i.productoId, 
          cantidad: i.cantidad,
          descuentoLinea: i.bonificacion
        })),
        montoRecibido: montoRecibidoNum,
        medioPago,
        clienteId: cliente?.id || null,
        aperturaCajaId,
        listaPrecioId: (aplicarLista && listaSeleccionadaId) ? parseInt(listaSeleccionadaId, 10) : null,
        descuentoGlobal: descNum
      };

      const res = await api.post('/ventas', payload);

      const vueltoStr = esEfectivo ? Number(res.data.vuelto).toFixed(2) : '0.00';
      toast.success(`Venta registrada con éxito | Vuelto: $${vueltoStr}`, {
        duration: 5000,
        style: { padding: '16px', fontWeight: 'bold', fontSize: '1.1rem' }
      });

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
    <div className="h-full flex flex-row relative">
      {/* COLUMNA IZQ: Carrito */}
      <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">

        {/* Header con Buscador y Select Lista de Precios */}
        <div className="p-4 bg-white shadow-sm z-30 flex gap-4 items-center border-b border-gray-200 relative">
          <form onSubmit={handleScan} className="relative flex-1 max-w-xl flex gap-2">
            <div className="w-1/3">
              <select 
                className="w-full p-3 border-2 border-brand-light rounded-lg focus:outline-none focus:border-blue-400 bg-white font-medium text-gray-700"
                value={filtroCategoria}
                onChange={e => {
                  setFiltroCategoria(e.target.value);
                  focusScan();
                }}
              >
                <option value="">Todas las categorías</option>
                {categoriasLista.map(cat => (
                  <optgroup key={cat.id} label={cat.nombre}>
                    <option value={cat.id}>{cat.nombre} (Principal)</option>
                    {cat.subcategorias?.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>↳ {sub.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={scanInputRef}
                type="text"
                placeholder="Escanear o buscar (min 2 letras)..."
                className="w-full pl-10 pr-4 py-3 text-lg border-2 border-brand-light rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-shadow"
                value={scanValue}
                onChange={e => setScanValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    montoInputRef.current?.focus();
                    return;
                  }
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

              {/* Resultados Búsqueda Rápida */}
              {productosBuscados.length > 0 && (
                <div ref={resultadosRef} className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-[100] max-h-96 overflow-y-auto">
                  {productosBuscados.map(prod => (
                    <div 
                      key={prod.id} 
                      className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => {
                        agregarProducto(prod, 1);
                        setScanValue('');
                        setProductosBuscados([]);
                        focusScan();
                      }}
                    >
                      <div>
                        <div className="font-bold text-gray-800">{prod.nombre}</div>
                        <div className="text-xs text-gray-400">{prod.codigoBarras || 'S/N'} | {prod.categoria?.nombre || 'Sin cat.'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-brand-dark">${Number(prod.precioVenta).toFixed(2)}</div>
                        <div className={`text-xs font-bold ${prod.stockActual <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          Stock: {prod.stockActual}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>

          <div className="w-[280px]">
            <div className="flex items-center gap-2 mb-1">
              <input 
                type="checkbox" 
                id="checkLista" 
                className="w-4 h-4 text-brand-light rounded focus:ring-brand-light cursor-pointer"
                checked={aplicarLista}
                onChange={(e) => setAplicarLista(e.target.checked)}
              />
              <label htmlFor="checkLista" className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase cursor-pointer">
                <Tag size={14} /> Aplicar Lista de Precios
              </label>
            </div>
            <select
              disabled={!aplicarLista}
              value={listaSeleccionadaId}
              onChange={e => setListaSeleccionadaId(e.target.value)}
              className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light font-bold text-gray-700 bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {listasPrecio.map(lista => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre} {lista.valor !== 0 ? `(${lista.valor > 0 ? '+' : ''}${lista.valor}${lista.tipoModificador === 'PORCENTAJE' ? '%' : '$'})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla (Scroll independiente) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 relative z-0">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ShoppingCart size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg">El carrito está vacío</p>
                <p className="text-sm">Escaneá un producto o búscalo por nombre</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-gray-600 font-semibold w-1/3">Producto</th>
                  <th className="p-3 text-gray-600 font-semibold text-center w-20">Cant.</th>
                  <th className="p-3 text-gray-600 font-semibold text-center w-24">Bonif. (%)</th>
                  <th className="p-3 text-gray-600 font-semibold text-right w-32">Precio Unit.</th>
                  <th className="p-3 text-gray-600 font-semibold text-right w-32">Subtotal</th>
                  <th className="p-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const modificadoTotal = Math.abs(item.precioBase - item.precioUnitario) > 0.01;

                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 transition-colors cursor-default ${selectedIndex === idx ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                      onClick={() => { setSelectedIndex(idx); focusScan(); }}
                    >
                      <td className="p-3 font-medium text-gray-800">{item.nombre}</td>
                      <td className="p-3 text-center font-bold text-gray-700">{item.cantidad}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            className="w-16 p-1 border rounded text-center text-sm font-bold focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                            value={item.bonificacion || ''}
                            onChange={(e) => updateBonificacion(idx, Number(e.target.value))}
                            onFocus={() => setSelectedIndex(idx)}
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {modificadoTotal && (
                          <div className="text-xs text-gray-400 line-through mb-0.5">
                            ${item.precioBase.toFixed(2)}
                          </div>
                        )}
                        <div className={`font-medium ${modificadoTotal ? (item.precioUnitario > item.precioBase ? 'text-orange-600' : 'text-green-600') : 'text-gray-600'}`}>
                          ${item.precioUnitario.toFixed(2)}
                        </div>
                      </td>
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
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* COLUMNA DER: Cobro */}
      <div className="w-[400px] lg:w-[450px] xl:w-[500px] bg-white flex flex-col shadow-[rgba(0,0,0,0.05)_-4px_0_10px] z-20 shrink-0">
        <div className="p-6 bg-brand-dark text-white flex flex-col items-end border-b-4 border-brand-light">
          <div className="text-brand-light/80 text-sm font-semibold uppercase tracking-wider mb-1">Total a cobrar</div>
          <div className="text-5xl font-bold">${total.toFixed(2)}</div>
          {descNum > 0 && (
            <div className="text-red-300 text-sm mt-1 font-medium">
              Subtotal: ${totalItems.toFixed(2)} - Descuento: ${descNum.toFixed(2)}
            </div>
          )}
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

          <div className="flex gap-4">
            {/* Medio de Pago */}
            <div className="flex-1">
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
            {/* Descuento Global */}
            <div className="w-1/3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase mb-2">
                <Percent size={16} /> Desc. ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full p-3 border rounded font-bold focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light text-right text-red-600 bg-white"
                value={descuentoGlobal}
                onChange={e => setDescuentoGlobal(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Input Monto & Info Vuelto */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-auto">
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
