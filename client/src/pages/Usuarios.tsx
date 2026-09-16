import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

const Usuarios = () => {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'CAJERO',
  });

  // Solo ADMIN o SUPERADMIN pueden ver/gestionar
  const tienePermiso = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    if (tienePermiso) {
      cargarUsuarios();
    }
  }, [tienePermiso]);

  const cargarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      toast.error('Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData({ nombre: '', email: '', password: '', rol: 'CAJERO' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (u: Usuario) => {
    setEditando(u);
    setFormData({ nombre: u.nombre, email: u.email, password: '', rol: u.rol });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.email.trim()) {
      toast.error('Nombre y Email son obligatorios');
      return;
    }

    if (!editando && !formData.password.trim()) {
      toast.error('La contraseña es obligatoria para un usuario nuevo');
      return;
    }

    setGuardando(true);
    const payload: any = {
      nombre: formData.nombre.trim(),
      email: formData.email.trim(),
      rol: formData.rol,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, payload);
        toast.success('Usuario actualizado exitosamente');
      } else {
        await api.post('/usuarios', payload);
        toast.success('Usuario creado exitosamente');
      }
      cerrarModal();
      cargarUsuarios();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Estás seguro de deshabilitar este usuario? No podrá volver a iniciar sesión.')) {
      try {
        await api.put(`/usuarios/${id}`, { activo: false });
        toast.success('Usuario deshabilitado');
        cargarUsuarios();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al deshabilitar');
      }
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
          <h1 className="text-2xl font-bold text-brand-dark">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Administrá el acceso y roles de tu equipo</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="bg-brand-dark text-white px-4 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2 shadow-md"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">Cargando usuarios...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No hay usuarios registrados</td>
                </tr>
              ) : (
                usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-800">{u.nombre}</td>
                    <td className="p-4 text-sm text-gray-600">{u.email}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        u.rol === 'ADMIN' || u.rol === 'SUPERADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => abrirModalEditar(u)}
                          className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleEliminar(u.id)}
                          disabled={usuario?.id === u.id} // No se puede borrar a sí mismo
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Deshabilitar"
                        >
                          <Trash2 size={16} />
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
                {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleGuardar} className="flex flex-col gap-4">
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
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Rol *</label>
                  <select
                    required
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                    value={formData.rol}
                    onChange={e => setFormData({...formData, rol: e.target.value})}
                  >
                    <option value="CAJERO">CAJERO</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña {editando ? '(Dejar en blanco para mantener actual)' : '*'}</label>
                  <input
                    type="password"
                    required={!editando}
                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 focus:bg-white"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
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

export default Usuarios;
