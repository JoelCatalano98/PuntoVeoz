
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import RutaProtegida from './components/RutaProtegida';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';
import Layout from './components/Layout';
import Clientes from './pages/Clientes';
import Caja from './pages/Caja';
import CajaMovimientos from './pages/CajaMovimientos';
import Parametros from './pages/Parametros';
import EtiquetasImpresion from './pages/EtiquetasImpresion';
import Categorias from './pages/Categorias';
import Unidades from './pages/Unidades';
import Usuarios from './pages/Usuarios';
import PuntosVenta from './pages/PuntosVenta';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              {/* Rutas para todos los autenticados */}
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/caja" element={<Caja />} />
              <Route path="/caja-movimientos" element={<CajaMovimientos />} />
              <Route path="/etiquetas" element={<EtiquetasImpresion />} />
              
              {/* Rutas para ADMIN y SUPERADMIN */}
              <Route element={<RutaProtegida rolesPermitidos={['SUPERADMIN', 'ADMIN']} />}>
                <Route path="/categorias" element={<Categorias />} />
                <Route path="/unidades" element={<Unidades />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/puntos-venta" element={<PuntosVenta />} />
              </Route>

              {/* Rutas solo para SUPERADMIN */}
              <Route element={<RutaProtegida rolesPermitidos={['SUPERADMIN']} />}>
                <Route path="/parametros" element={<Parametros />} />
              </Route>

              <Route path="/" element={<Navigate to="/ventas" replace />} />
              
              {/* Ruta comodín para pantallas aún no implementadas */}
              <Route path="*" element={
                <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                  <h2 className="text-2xl font-bold text-gray-500">En Construcción</h2>
                  <p>Este módulo será implementado próximamente.</p>
                </div>
              } />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
