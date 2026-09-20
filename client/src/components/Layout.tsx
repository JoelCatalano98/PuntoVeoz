import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Wallet, Package, Users, LogOut, Bell, BarChart3 } from 'lucide-react';
import api from '../services/api';

const NavDropdown = ({ title, items }: { title: string, items: {label: string, disabled?: boolean, to?: string}[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="relative group h-full flex items-center">
      <button className="px-3 py-1 rounded hover:bg-black/10 transition-colors h-full font-medium flex items-center cursor-default">
        {title}
      </button>
      <div className="absolute top-full left-0 hidden group-hover:block w-56 bg-white border border-gray-200 shadow-lg py-1 z-50">
        {items.map((item, idx) => (
          item.disabled ? (
            <div key={idx} className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
              {item.label}
            </div>
          ) : (
            <Link key={idx} to={item.to || '#'} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              {item.label}
            </Link>
          )
        ))}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const res = await api.get('/stock/alertas');
        setAlertas(res.data);
      } catch (err) {
        console.error('Error fetching stock alerts', err);
      }
    };
    fetchAlertas();
  }, [location.pathname]);

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full hover:bg-black/10 transition-colors outline-none"
      >
        <Bell size={20} />
        {alertas.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {alertas.length > 99 ? '99+' : alertas.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-50">
          <div className="bg-red-50 p-3 border-b border-red-100 flex justify-between items-center">
            <h3 className="font-bold text-red-800">Alertas de Stock ({alertas.length})</h3>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {alertas.length === 0 ? (
              <p className="text-sm text-gray-500 p-2 text-center">No hay productos con stock crítico.</p>
            ) : (
              alertas.map(a => (
                <div key={a.id} className="p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div className="text-sm font-semibold text-gray-800">{a.nombre}</div>
                  <div className="text-xs text-gray-500 flex justify-between mt-1">
                    <span>Actual: <span className="text-red-600 font-bold">{a.stockActual}</span></span>
                    <span>Mínimo: {a.stockMinimo}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Layout = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-sm print:h-auto print:overflow-visible">
      {/* Top bar (fixed) */}
      <header className="flex-none h-[52px] bg-brand-light text-brand-dark flex items-center justify-between px-4 z-40 border-b border-black/10 print:hidden">
        <div className="flex items-center h-full gap-6">
          <div className="font-bold text-lg mr-4">Punto Veloz</div>
          
          <nav className="flex items-center h-full gap-1">
            <NavDropdown 
              title="Ventas" 
              items={[
                { label: 'Pantalla de ventas', to: '/ventas' },
                { label: 'Historial de ventas', to: '/ventas-historial' },
                { label: 'Órdenes de retiro/remitos', to: '/ventas-historial?tab=REMITOS' },
                { label: 'Presupuestos', to: '/ventas-historial?tab=PRESUPUESTO' },
                { label: 'Facturas de venta', disabled: true }
              ]} 
            />
            
            <NavDropdown 
              title="Compras" 
              items={[
                { label: 'Cargar Compra', to: '/compras-carga' },
                { label: 'Historial de Compras', to: '/compras-historial' },
                { label: 'Proveedores', to: '/proveedores' },
                { label: 'Órdenes de entrega', disabled: true }
              ]} 
            />
            
            <Link to="/clientes" className="px-3 py-1 rounded hover:bg-black/10 transition-colors h-full font-medium flex items-center">
              Clientes
            </Link>
            
            <NavDropdown 
              title="Producto" 
              items={[
                { label: 'Productos', to: '/productos' },
                { label: 'Crear Producto', to: '/productos?nuevo=true' },
                { label: 'Categorías', to: '/categorias' },
                { label: 'Listas de Precios', to: '/listas-precio' },
                { label: 'Unidades de Medida', to: '/unidades' },
                { label: 'Impresión de Etiquetas', to: '/etiquetas' }
              ]} 
            />

            <NavDropdown 
              title="Stock e Inventario" 
              items={[
                { label: 'Stock Valorizado', to: '/stock-valorizado' },
                { label: 'Ajuste Manual de Stock', to: '/ajuste-stock' },
                { label: 'Historial de Movimientos', to: '/historial-stock' }
              ]} 
            />

            <NavDropdown 
              title="Utilidades" 
              items={[
                { label: 'Caja', to: '/caja' },
                { label: 'Movimientos de Caja', to: '/caja-movimientos' },
                { label: 'Historial de Arqueos', to: '/caja-cierres' }
              ]} 
            />
            
            <NavDropdown 
              title="Configuraciones" 
              items={[
                (usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN') ? { label: 'Puntos de venta', to: '/puntos-venta' } : null,
                (usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN') ? { label: 'Usuarios', to: '/usuarios' } : null,
                usuario?.rol === 'SUPERADMIN' ? { label: 'Parámetros', to: '/parametros' } : null
              ].filter(Boolean) as any} 
            />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <span className="font-medium text-brand-dark/80 border-l border-brand-dark/20 pl-4">
            {usuario?.nombre || 'Usuario'}
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-black/10 transition-colors font-medium"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      {/* Main layout below top bar */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">
        {/* Sidebar */}
        <aside className="w-[150px] bg-white border-r border-gray-200 flex flex-col p-3 z-30 print:hidden">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Más usadas
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/dashboard" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 bg-gray-200 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <BarChart3 size={24} />
              <span className="font-medium">Dashboard</span>
            </Link>
            
            <Link to="/ventas" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 bg-gray-200 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <ShoppingCart size={24} />
              <span className="font-medium">Ventas</span>
            </Link>
            
            <Link to="/caja" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 bg-gray-200 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <Wallet size={24} />
              <span className="font-medium">Caja</span>
            </Link>
            
            <Link to="/productos" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 bg-gray-200 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <Package size={24} />
              <span className="font-medium">Productos</span>
            </Link>
            
            <Link to="/clientes" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 bg-gray-200 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <Users size={24} />
              <span className="font-medium">Clientes</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative print:overflow-visible print:bg-white print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Global Footer */}
      <footer className="flex-none bg-white border-t border-gray-200 py-1.5 px-4 z-40 print:hidden flex justify-between items-center">
        <div className="text-[11px] font-bold text-gray-400">Punto Veloz</div>
        <div className="text-[11px] text-gray-400">v1.0 - <span className="text-green-500 font-bold">Activo</span></div>
      </footer>
    </div>
  );
};

export default Layout;
