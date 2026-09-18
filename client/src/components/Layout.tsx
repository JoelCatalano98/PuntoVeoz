
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Wallet, Package, Users, LogOut } from 'lucide-react';

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
      <header className="flex-none h-[52px] bg-brand-light text-brand-dark flex items-center justify-between px-4 z-40 border-b border-black/10">
        <div className="flex items-center h-full gap-6">
          <div className="font-bold text-lg mr-4">Punto Veloz</div>
          
          <nav className="flex items-center h-full gap-1">
            <NavDropdown 
              title="Ventas" 
              items={[
                { label: 'Pantalla de ventas', to: '/ventas' },
                { label: 'Órdenes de retiro/remitos' },
                { label: 'Presupuestos' },
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
              title="Utilidades" 
              items={[
                { label: 'Caja', to: '/caja' },
                { label: 'Movimientos de Caja', to: '/caja-movimientos' },
                { label: 'Cierre de caja diario' },
                { label: 'Cierre/reporte semanal' },
                { label: 'Ajuste Manual de Stock', to: '/ajuste-stock' },
                { label: 'Historial de Stock', to: '/historial-stock' }
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
          <span className="font-medium text-brand-dark/80">
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
    </div>
  );
};

export default Layout;
