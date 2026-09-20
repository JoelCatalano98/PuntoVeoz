import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Users } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Cliente {
  id: number;
  nombre: string;
  numeroDoc: string | null;
  razonSocial: string | null;
  direccion: string | null;
}

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Estados Modal
  const [showModal, setShowModal] = useState(false);
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null);
  const [nombre, setNombre] = useState('');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarClientes(1, busqueda);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [busqueda]);

  const cargarClientes = async (pageToLoad = page, searchTxt = busqueda) => {
    setCargando(true);
    try {
      const res = await api.get('/clientes', {
        params: { page: pageToLoad, limit, search: searchTxt }
      });
      setClientes(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.totalCount);
      setPage(pageToLoad);
    } catch (err) {
      toast.error('Error al cargar clientes');
    } finally {
      setCargando(false);
    }
  };

  const handleNuevo = () => {
    setClienteActual(null);
    setNombre('');
    setRazonSocial('');
    setNumeroDoc('');
    setDireccion('');
    setShowModal(true);
  };

  const handleEditar = (cliente: Cliente) => {
    setClienteActual(cliente);
    setNombre(cliente.nombre);
    setRazonSocial(cliente.razonSocial || '');
    setNumeroDoc(cliente.numeroDoc || '');
    setDireccion(cliente.direccion || '');
    setShowModal(true);
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseás eliminar a ${nombre}?`)) {
      return;
    }

    try {
      await api.put(`/clientes/${id}`, { activo: false });
      toast.success('Cliente eliminado correctamente');
      cargarClientes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar cliente (puede que tenga ventas asociadas)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const payload = {
        nombre,
        razonSocial: razonSocial.trim() === '' ? null : razonSocial,
        numeroDoc: numeroDoc.trim() === '' ? null : numeroDoc,
        direccion: direccion.trim() === '' ? null : direccion
      };

      if (clienteActual) {
        await api.put(`/clientes/${clienteActual.id}`, payload);
        toast.success('Cliente actualizado correctamente');
      } else {
        await api.post('/clientes', payload);
        toast.success('Cliente creado correctamente');
      }

      setShowModal(false);
      cargarClientes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setGuardando(false);
    }
  };

  // El filtrado es server-side, no necesitamos clientesFiltrados
  const clientesFiltrados = clientes;

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-3">
          <Users className="text-brand-light" size={32} /> Gestión de Clientes
        </h1>
        <button 
          onClick={handleNuevo}
          className="bg-brand-light text-brand-dark px-6 py-2.5 rounded-lg font-bold shadow-sm hover:bg-blue-400 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex-1 flex flex-col overflow-hidden transition-colors duration-200">
        {/* Barra de Búsqueda */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center bg-gray-50/50 dark:bg-slate-800/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o documento..." 
              className="w-full pl-10 pr-4 py-2.5 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {cargando ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">Cargando clientes...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white dark:bg-slate-800 sticky top-0 border-b border-gray-100 dark:border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Nombre</th>
                  <th className="p-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Razón Social</th>
                  <th className="p-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Documento (CUIT/DNI)</th>
                  <th className="p-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400 dark:text-slate-500">
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map(cliente => (
                    <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-gray-700 dark:text-slate-200">{cliente.nombre}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-slate-300">{cliente.razonSocial || '-'}</td>
                      <td className="p-4 text-sm text-gray-500 dark:text-slate-400">
                        {cliente.numeroDoc || <span className="text-gray-300 dark:text-slate-600 italic">Sin especificar</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditar(cliente)}
                            className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleEliminar(cliente.id, cliente.nombre)}
                            className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalCount={totalCount} 
          onPageChange={(newPage) => cargarClientes(newPage)} 
        />
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transition-colors duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                {clienteActual ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Razón Social</label>
                <input
                  type="text"
                  className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Documento (CUIT/DNI)</label>
                <input
                  type="text"
                  className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                  value={numeroDoc}
                  onChange={e => setNumeroDoc(e.target.value)}
                  placeholder="Ej: 20-12345678-9"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Dirección</label>
                <input
                  type="text"
                  className="w-full p-3 border dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Ej: San Martín 123"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3 text-gray-600 dark:text-slate-300 font-bold bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando} 
                  className="flex-1 py-3 bg-brand-dark text-white font-bold rounded-lg hover:bg-black disabled:opacity-50 transition-colors shadow-md"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
