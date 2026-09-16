import React, { useState, useEffect } from 'react';
import { Plus, Edit2, ShieldAlert, Store, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface PuntoVenta {
  id: number;
  nombre: string;
  tipo: string;
  activo: boolean;
}

const PuntosVenta = () => {
  const { usuario } = useAuth();
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<PuntoVenta | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'MANUAL',
  });

  // Solo ADMIN o SUPERADMIN
  const tienePermiso = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    if (tienePermiso) {
      cargarPuntosVenta();
    }
  }, [tienePermiso]);

  const cargarPuntosVenta = async () => {
    try {
      const res = await api.get('/puntos-venta');
      setPuntosVenta(res.data);
    } catch (err) {
      toast.error('Error al cargar puntos de venta');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData({ nombre: '', tipo: 'MANUAL' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (pv: PuntoVenta) => {
    setEditando(pv);
    setFormData({ nombre: pv.nombre, tipo: pv.tipo });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El Número o Nombre es obligatorio');
      return;
    }

    setGuardando(true);
    const payload = {
      nombre: formData.nombre.trim(),
      tipo: formData.tipo,
    };

    try {
      if (editando) {
        await api.put(`/puntos-venta/${editando.id}`, payload);
        toast.success('Punto de Venta actualizado exitosamente');
      } else {
        await api.post('/puntos-venta', payload);
        toast.success('Punto de Venta creado exitosamente');
      }
      cerrarModal();
      cargarPuntosVenta();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el Punto de Venta');
    } finally {
      setGuardando(false);
    }
  };

  if (!tienePermiso) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 text-gray-500">
        <ShieldAlert size={48} className="mb-4 text-red-400" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p>No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Store /> Puntos de Venta
          </h1>
          <p className="text-gray-500 text-sm mt-1">Administrá las bocas de facturación y puestos</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="bg-brand-dark text-white px-4 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2 shadow-md"
        >
          <Plus size={20} />
          Nuevo Punto de Venta
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Número</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">Cargando puntos de venta...</td>
                </tr>
              ) : puntosVenta.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">No hay puntos de venta registrados</td>
                </tr>
              ) : (
                puntosVenta.map(pv => (
                  <tr key={pv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-black text-gray-800">{pv.nombre.padStart(4, '0')}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        pv.tipo === 'WEBSERVICE' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {pv.tipo}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => abrirModalEditar(pv)}
                          className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-brand-dark">
                {editando ? 'Editar Punto de Venta' : 'Nuevo Punto de Venta'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleGuardar} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Número (Ej: 1) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    autoFocus
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white text-lg font-bold"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">El número de punto de venta (0001, 0002, etc).</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo *</label>
                  <select
                    required
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                    value={formData.tipo}
                    onChange={e => setFormData({...formData, tipo: e.target.value})}
                  >
                    <option value="MANUAL">MANUAL (Ticket Interno no fiscal)</option>
                    <option value="WEBSERVICE">WEBSERVICE (Factura Electrónica ARCA)</option>
                  </select>
                </div>

                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={cerrarModal} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando} className="flex-1 py-3 bg-brand-dark text-white font-bold rounded-lg hover:bg-black disabled:opacity-50 shadow-md">
                    {guardando ? 'Guardando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuntosVenta;
