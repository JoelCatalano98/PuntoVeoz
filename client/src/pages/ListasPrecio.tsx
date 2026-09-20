import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, PercentSquare } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ListaPrecio {
  id: number;
  nombre: string;
  tipoModificador: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  esPredeterminada: boolean;
}

const ListasPrecio = () => {
  const { usuario } = useAuth();
  const [listas, setListas] = useState<ListaPrecio[]>([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<ListaPrecio | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    tipoModificador: 'PORCENTAJE',
    valor: '',
    esPredeterminada: false
  });

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERADMIN';

  useEffect(() => {
    cargarListas();
  }, []);

  const cargarListas = async () => {
    try {
      const res = await api.get('/listas-precio');
      setListas(res.data);
    } catch (error) {
      toast.error('Error al cargar listas de precio');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFormData({ nombre: '', tipoModificador: 'PORCENTAJE', valor: '', esPredeterminada: false });
    setMostrarModal(true);
  };

  const abrirModalEditar = (lista: ListaPrecio) => {
    setEditando(lista);
    setFormData({
      nombre: lista.nombre,
      tipoModificador: lista.tipoModificador,
      valor: lista.valor.toString(),
      esPredeterminada: lista.esPredeterminada
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || formData.valor === '') {
      toast.error('Nombre y Valor son obligatorios');
      return;
    }

    setGuardando(true);
    const payload = {
      nombre: formData.nombre.trim(),
      tipoModificador: formData.tipoModificador,
      valor: Number(formData.valor),
      esPredeterminada: formData.esPredeterminada
    };

    try {
      if (editando) {
        await api.put(`/listas-precio/${editando.id}`, payload);
        toast.success('Lista actualizada');
      } else {
        await api.post('/listas-precio', payload);
        toast.success('Lista creada');
      }
      cerrarModal();
      cargarListas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (window.confirm('¿Eliminar esta lista de precios?')) {
      try {
        await api.delete(`/listas-precio/${id}`);
        toast.success('Lista eliminada');
        cargarListas();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark dark:text-slate-200 flex items-center gap-2">
            <PercentSquare size={24} className="text-brand-light" /> Listas de Precios
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Configura modificadores globales de precio</p>
        </div>
        {puedeEditar && (
          <button 
            onClick={abrirModalNuevo}
            className="bg-brand-light text-brand-dark px-4 py-2 rounded-lg font-bold hover:bg-blue-300 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            Nueva Lista
          </button>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-200">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Predeterminada</th>
                {puedeEditar && (
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center w-28">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-slate-500">Cargando listas...</td>
                </tr>
              ) : listas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-slate-500">No hay listas de precios configuradas</td>
                </tr>
              ) : (
                listas.map(lista => (
                  <tr key={lista.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-gray-800 dark:text-slate-200">{lista.nombre}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-400">
                      {lista.tipoModificador === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto Fijo ($)'}
                    </td>
                    <td className={`p-4 text-sm font-bold ${lista.valor < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                      {lista.valor > 0 ? '+' : ''}{lista.valor}
                    </td>
                    <td className="p-4 text-sm text-center">
                      {lista.esPredeterminada ? (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-bold">Sí</span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    {puedeEditar && (
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => abrirModalEditar(lista)}
                            className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleEliminar(lista.id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
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
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] transition-colors duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-brand-dark dark:text-slate-200">
                {editando ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="lista-form" onSubmit={handleGuardar} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Nombre de la Lista *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Mayorista, Promoción Navideña..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Tipo de Modificador</label>
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light transition-colors"
                    value={formData.tipoModificador}
                    onChange={e => setFormData({ ...formData, tipoModificador: e.target.value })}
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO_FIJO">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                    value={formData.valor}
                    onChange={e => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="Ej: -15 para descuento, 10 para recargo"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Usa números negativos para descuentos y positivos para recargos.</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="esPredeterminada"
                    className="w-4 h-4 text-brand-light border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded focus:ring-brand-light"
                    checked={formData.esPredeterminada}
                    onChange={e => setFormData({ ...formData, esPredeterminada: e.target.checked })}
                  />
                  <label htmlFor="esPredeterminada" className="text-sm font-bold text-gray-700 dark:text-slate-300 cursor-pointer">
                    Establecer como lista predeterminada
                  </label>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end gap-3 shrink-0 transition-colors">
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="lista-form"
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

export default ListasPrecio;
