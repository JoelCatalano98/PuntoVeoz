import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Cliente {
  id: number;
  nombre: string;
  numeroDoc?: string;
  razonSocial?: string;
  direccion?: string;
  condicionIva?: string;
}

interface ClienteModalProps {
  onClose: () => void;
  onSelect: (cliente: Cliente | null) => void;
}

const ClienteModal: React.FC<ClienteModalProps> = ({ onClose, onSelect }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState('');
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form para nuevo
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaRazonSocial, setNuevaRazonSocial] = useState('');
  const [nuevoDoc, setNuevoDoc] = useState('');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevaCondicionIva, setNuevaCondicionIva] = useState('Consumidor Final');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarClientes();
    // Focus search input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const cargarClientes = async () => {
    try {
      const res = await api.get('/clientes');
      if (res.data && Array.isArray(res.data.data)) {
        setClientes(res.data.data);
      } else if (Array.isArray(res.data)) {
        setClientes(res.data);
      } else {
        setClientes([]);
      }
    } catch (err) {
      toast.error('Error al cargar clientes');
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.post('/clientes', {
        nombre: nuevoNombre,
        razonSocial: nuevaRazonSocial || undefined,
        numeroDoc: nuevoDoc || undefined,
        direccion: nuevaDireccion || undefined,
        condicionIva: nuevaCondicionIva || undefined
      });
      toast.success('Cliente creado');
      onSelect(res.data);
    } catch (err) {
      toast.error('Error al crear cliente');
      setGuardando(false);
    }
  };

  const filtrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
    (c.numeroDoc && c.numeroDoc.includes(filtro))
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh] transition-colors duration-200">
        
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-bold text-brand-dark dark:text-brand-light">Seleccionar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
          {!mostrarNuevo ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar por nombre o doc..."
                    className="w-full pl-9 pr-3 py-2 border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setMostrarNuevo(true)}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus size={18} /> Nuevo
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border dark:border-slate-700 rounded divide-y dark:divide-slate-700">
                <button 
                  onClick={() => onSelect(null)}
                  className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700 font-medium text-gray-800 dark:text-slate-200 transition-colors"
                >
                  Consumidor Final
                </button>
                {filtrados.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => onSelect(c)}
                    className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700 flex justify-between transition-colors"
                  >
                    <span className="font-medium text-gray-800 dark:text-slate-200">{c.nombre}</span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">{c.numeroDoc}</span>
                  </button>
                ))}
                {filtrados.length === 0 && (
                  <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">No hay resultados</div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleCrear} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Nombre *</label>
                <input
                  type="text"
                  autoFocus
                  required
                  className="w-full p-2 border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Razón Social</label>
                <input
                  type="text"
                  className="w-full p-2 border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                  value={nuevaRazonSocial}
                  onChange={e => setNuevaRazonSocial(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Documento (CUIT/DNI)</label>
                <input
                  type="text"
                  className="w-full p-2 border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                  value={nuevoDoc}
                  onChange={e => setNuevoDoc(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Dirección</label>
                <input
                  type="text"
                  className="w-full p-2 border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                  value={nuevaDireccion}
                  onChange={e => setNuevaDireccion(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Condición IVA</label>
                <select
                  className="w-full p-2 border dark:border-slate-600 rounded focus:outline-none focus:border-brand-light bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                  value={nuevaCondicionIva}
                  onChange={e => setNuevaCondicionIva(e.target.value)}
                >
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributo">Monotributo</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => setMostrarNuevo(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="px-4 py-2 bg-brand-light dark:bg-blue-500 text-brand-dark dark:text-white font-bold rounded hover:bg-blue-400 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteModal;
