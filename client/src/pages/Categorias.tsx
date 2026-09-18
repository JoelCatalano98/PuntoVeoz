import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Categoria {
  id: number;
  nombre: string;
  color: string;
  activo: boolean;
  categoriaPadreId?: number | null;
  subcategorias?: Categoria[];
}

const Categorias = () => {
  const { usuario } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    color: '#CCCCCC',
    categoriaPadreId: '',
  });

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      const res = await api.get('/categorias');
      setCategorias(res.data);
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData({ nombre: '', color: '#CCCCCC', categoriaPadreId: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (cat: Categoria, parentId?: number) => {
    setEditando(cat);
    setFormData({ 
      nombre: cat.nombre, 
      color: cat.color,
      categoriaPadreId: parentId ? parentId.toString() : ''
    });
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
      color: formData.color,
      categoriaPadreId: formData.categoriaPadreId ? parseInt(formData.categoriaPadreId, 10) : null
    };

    try {
      if (editando) {
        await api.put(`/categorias/${editando.id}`, payload);
        toast.success('Categoría actualizada exitosamente');
      } else {
        await api.post('/categorias', payload);
        toast.success('Categoría creada exitosamente');
      }
      cerrarModal();
      cargarCategorias();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar la categoría');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría? No afectará a los productos existentes.')) {
      try {
        await api.delete(`/categorias/${id}`);
        toast.success('Categoría eliminada');
        cargarCategorias();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Categorías</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de rubros de productos</p>
        </div>
        {puedeEditar && (
          <button 
            onClick={abrirModalNuevo}
            className="bg-brand-light text-brand-dark px-4 py-2 rounded-lg font-bold hover:bg-blue-300 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            Nueva Categoría
          </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Color</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                {puedeEditar && (
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">Cargando categorías...</td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">No se encontraron categorías</td>
                </tr>
              ) : (
                categorias.map(cat => (
                  <React.Fragment key={cat.id}>
                    <tr className="hover:bg-blue-50/50 transition-colors bg-white">
                      <td className="p-4">
                        <div 
                          className="w-6 h-6 rounded border shadow-sm"
                          style={{ backgroundColor: cat.color }}
                          title={cat.color}
                        />
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-800">{cat.nombre}</td>
                      {puedeEditar && (
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => abrirModalEditar(cat)}
                              className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleEliminar(cat.id)}
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {cat.subcategorias?.map(sub => (
                      <tr key={sub.id} className="hover:bg-blue-50/50 transition-colors bg-gray-50/50">
                        <td className="p-4">
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-600 pl-8 border-l-2 border-gray-200">
                          ↳ {sub.nombre}
                        </td>
                        {puedeEditar && (
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => abrirModalEditar(sub, cat.id)}
                                className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleEliminar(sub.id)}
                                className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
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
                {editando ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <form id="categoria-form" onSubmit={handleGuardar} className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Categoría Padre (Opcional)</label>
                  <select
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white text-gray-700"
                    value={formData.categoriaPadreId}
                    onChange={e => setFormData({...formData, categoriaPadreId: e.target.value})}
                  >
                    <option value="">(Ninguna - Es categoría principal)</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id} disabled={editando?.id === cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Si seleccionas una categoría padre, esta se convertirá en una subcategoría.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Color Identificatorio</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-12 h-12 p-1 border rounded cursor-pointer"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                    <span className="text-sm text-gray-500 font-mono uppercase">{formData.color}</span>
                  </div>
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
                form="categoria-form"
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

export default Categorias;
