import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Building2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Proveedor {
  id: number;
  razonSocial: string;
  cuit: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
}

const Proveedores = () => {
  const { usuario } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    razonSocial: '',
    cuit: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      const res = await api.get('/proveedores');
      setProveedores(res.data);
    } catch (err) {
      toast.error('Error al cargar proveedores');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData({ razonSocial: '', cuit: '', telefono: '', email: '', direccion: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (prov: Proveedor) => {
    setEditando(prov);
    setFormData({ 
      razonSocial: prov.razonSocial, 
      cuit: prov.cuit || '', 
      telefono: prov.telefono || '', 
      email: prov.email || '', 
      direccion: prov.direccion || '' 
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razonSocial.trim()) {
      toast.error('La Razón Social es obligatoria');
      return;
    }

    setGuardando(true);
    const payload = {
      razonSocial: formData.razonSocial.trim(),
      cuit: formData.cuit.trim() || null,
      telefono: formData.telefono.trim() || null,
      email: formData.email.trim() || null,
      direccion: formData.direccion.trim() || null,
    };

    try {
      if (editando) {
        await api.put(`/proveedores/${editando.id}`, payload);
        toast.success('Proveedor actualizado exitosamente');
      } else {
        await api.post('/proveedores', payload);
        toast.success('Proveedor creado exitosamente');
      }
      cerrarModal();
      cargarProveedores();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el proveedor');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este proveedor? Sus compras anteriores se mantendrán.')) {
      try {
        await api.delete(`/proveedores/${id}`);
        toast.success('Proveedor eliminado');
        cargarProveedores();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Building2 size={24} className="text-brand-light" /> Proveedores
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de proveedores del comercio</p>
        </div>
        {puedeEditar && (
          <button 
            onClick={abrirModalNuevo}
            className="bg-brand-light text-brand-dark px-4 py-2 rounded-lg font-bold hover:bg-blue-300 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            Nuevo Proveedor
          </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Razón Social</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CUIT</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                {puedeEditar && (
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Cargando proveedores...</td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No hay proveedores registrados</td>
                </tr>
              ) : (
                proveedores.map(prov => (
                  <tr key={prov.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-gray-800">{prov.razonSocial}</td>
                    <td className="p-4 text-sm text-gray-600">{prov.cuit || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{prov.telefono || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{prov.email || '-'}</td>
                    {puedeEditar && (
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => abrirModalEditar(prov)}
                            className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleEliminar(prov.id)}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold text-brand-dark">
                {editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="proveedor-form" onSubmit={handleGuardar} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                    value={formData.razonSocial}
                    onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
                    placeholder="Ej: Distribuidora Norte SRL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">CUIT</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                    value={formData.cuit}
                    onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                    placeholder="Sin guiones"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                    value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="proveedor-form"
                disabled={guardando}
                className="px-6 py-2 bg-brand-dark text-white font-bold rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50"
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

export default Proveedores;
