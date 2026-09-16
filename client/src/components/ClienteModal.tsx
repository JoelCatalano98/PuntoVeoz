import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Cliente {
  id: number;
  nombre: string;
  numeroDoc?: string;
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
  const [nuevoDoc, setNuevoDoc] = useState('');
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
      setClientes(res.data);
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
        numeroDoc: nuevoDoc || undefined
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold text-brand-dark">Seleccionar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
          {!mostrarNuevo ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar por nombre o doc..."
                    className="w-full pl-9 pr-3 py-2 border rounded focus:outline-none focus:border-brand-light"
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setMostrarNuevo(true)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1 font-medium"
                >
                  <Plus size={18} /> Nuevo
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border rounded divide-y">
                <button 
                  onClick={() => onSelect(null)}
                  className="w-full text-left p-3 hover:bg-blue-50 focus:bg-blue-50 font-medium"
                >
                  Consumidor Final
                </button>
                {filtrados.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => onSelect(c)}
                    className="w-full text-left p-3 hover:bg-blue-50 focus:bg-blue-50 flex justify-between"
                  >
                    <span className="font-medium">{c.nombre}</span>
                    <span className="text-sm text-gray-500">{c.numeroDoc}</span>
                  </button>
                ))}
                {filtrados.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">No hay resultados</div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleCrear} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  autoFocus
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:border-brand-light"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Documento (CUIT/DNI)</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded focus:outline-none focus:border-brand-light"
                  value={nuevoDoc}
                  onChange={e => setNuevoDoc(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => setMostrarNuevo(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="px-4 py-2 bg-brand-light text-brand-dark font-bold rounded hover:bg-blue-400 disabled:opacity-50"
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
