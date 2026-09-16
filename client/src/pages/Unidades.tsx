import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Unidad {
  id: number;
  nombre: string;
  abreviatura: string | null;
  activo: boolean;
}

const Unidades = () => {
  const { usuario } = useAuth();
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<Unidad | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    abreviatura: '',
  });

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    cargarUnidades();
  }, []);

  const cargarUnidades = async () => {
    try {
      const res = await api.get('/unidades-medida');
      setUnidades(res.data);
    } catch (err) {
      toast.error('Error al cargar unidades de medida');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData({ nombre: '', abreviatura: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (uni: Unidad) => {
    setEditando(uni);
    setFormData({ nombre: uni.nombre, abreviatura: uni.abreviatura || '' });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setGuardando(true);
    const payload = {
      nombre: formData.nombre.trim(),
      abreviatura: formData.abreviatura.trim() || undefined,
    };

    try {
      if (editando) {
        await api.put(`/unidades-medida/${editando.id}`, payload);
        toast.success('Unidad actualizada exitosamente');
      } else {
        await api.post('/unidades-medida', payload);
        toast.success('Unidad creada exitosamente');
      }
      cerrarModal();
      cargarUnidades();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar la unidad');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta unidad? No afectará a los productos existentes.')) {
      try {
        await api.delete(`/unidades-medida/${id}`);
        toast.success('Unidad eliminada');
        cargarUnidades();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Unidades de Medida</h1>
          <p className="text-gray-500 text-sm mt-1">Definición de formatos de venta (Pack, Kg, Litro)</p>
        </div>
        {puedeEditar && (
          <button 
            onClick={abrirModalNuevo}
            className="bg-brand-light text-brand-dark px-4 py-2 rounded-lg font-bold hover:bg-blue-300 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            Nueva Unidad
          </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Abreviatura</th>
                {puedeEditar && (
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">Cargando unidades...</td>
                </tr>
              ) : unidades.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">No se encontraron unidades</td>
                </tr>
              ) : (
                unidades.map(uni => (
                  <tr key={uni.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-800">{uni.nombre}</td>
                    <td className="p-4 text-sm font-mono text-gray-600">{uni.abreviatura || '-'}</td>
                    {puedeEditar && (
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => abrirModalEditar(uni)}
                            className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleEliminar(uni.id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
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
                {editando ? 'Editar Unidad' : 'Nueva Unidad'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <form id="unidad-form" onSubmit={handleGuardar} className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej: Bulto Cerrado"
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Abreviatura</label>
                  <input
                    type="text"
                    placeholder="Ej: BC"
                    maxLength={10}
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light font-mono bg-gray-50 focus:bg-white uppercase"
                    value={formData.abreviatura}
                    onChange={e => setFormData({...formData, abreviatura: e.target.value.toUpperCase()})}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                type="button" 
                onClick={cerrarModal}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="unidad-form"
                disabled={guardando}
                className="px-5 py-2.5 bg-brand-light text-brand-dark font-bold rounded-lg hover:bg-blue-400 disabled:opacity-50 transition-colors shadow-sm"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Unidades;
