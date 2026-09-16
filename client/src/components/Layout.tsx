
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Wallet, Package, Users, LogOut } from 'lucide-react';

const NavDropdown = ({ title, items }: { title: string, items: {label: string, disabled?: boolean, to?: string}[] }) => {
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-sm">
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
                { label: 'Facturas de compra' },
                { label: 'Proveedores' },
                { label: 'Órdenes de entrega' }
              ]} 
            />
            
            <Link to="/clientes" className="px-3 py-1 rounded hover:bg-black/10 transition-colors h-full font-medium flex items-center">
              Clientes
            </Link>
            
            <NavDropdown 
              title="Productos" 
              items={[
                { label: 'Catálogo (Ver Productos)', to: '/productos' },
                { label: 'Categorías', to: '/categorias' },
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
                { label: 'Stock' }
              ]} 
            />
            
            <NavDropdown 
              title="Configuraciones" 
              items={[
                { label: 'Puntos de venta', to: '/puntos-venta' },
                { label: 'Usuarios', to: '/usuarios' },
                { label: 'Parámetros', to: '/parametros' }
              ]} 
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[150px] bg-white border-r border-gray-200 flex flex-col p-3 z-30">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Más usadas
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/ventas" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <ShoppingCart size={24} />
              <span className="font-medium">Ventas</span>
            </Link>
            
            <Link to="/caja" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <Wallet size={24} />
              <span className="font-medium">Caja</span>
            </Link>
            
            <Link to="/productos" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <Package size={24} />
              <span className="font-medium">Productos</span>
            </Link>
            
            <Link to="/clientes" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors gap-2 text-gray-600 hover:text-blue-600">
              <Users size={24} />
              <span className="font-medium">Clientes</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
