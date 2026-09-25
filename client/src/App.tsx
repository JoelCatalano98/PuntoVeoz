
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import RutaProtegida from './components/RutaProtegida';
import Ventas from './pages/Ventas';
import VentasHistorial from './pages/VentasHistorial';
import Productos from './pages/Productos';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Caja from './pages/Caja';
import CajaMovimientos from './pages/CajaMovimientos';
import CierresHistorial from './pages/CierresHistorial';
import Parametros from './pages/Parametros';
import EtiquetasImpresion from './pages/EtiquetasImpresion';
import Categorias from './pages/Categorias';
import ListasPrecio from './pages/ListasPrecio';
import Unidades from './pages/Unidades';
import Usuarios from './pages/Usuarios';
import PuntosVenta from './pages/PuntosVenta';
import Proveedores from './pages/Proveedores';
import ComprasCarga from './pages/ComprasCarga';
import ComprasHistorial from './pages/ComprasHistorial';
import AjusteStock from './pages/AjusteStock';
import HistorialStock from './pages/HistorialStock';
import StockValorizado from './pages/StockValorizado';
import DocumentoForm from './pages/DocumentoForm';
import Facturacion from './pages/Facturacion';
import NotasCredito from './pages/NotasCredito';
import ConfiguracionesAdmin from './pages/ConfiguracionesAdmin';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              {/* Rutas para todos los autenticados */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/ventas-historial" element={<VentasHistorial />} />
              <Route path="/documento-form" element={<DocumentoForm />} />
              <Route path="/documento-form/:id" element={<DocumentoForm />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/caja" element={<Caja />} />
              <Route path="/caja-movimientos" element={<CajaMovimientos />} />
              <Route path="/caja-cierres" element={<CierresHistorial />} />
              <Route path="/etiquetas" element={<EtiquetasImpresion />} />
              
              {/* Rutas para ADMIN y SUPERADMIN */}
              <Route element={<RutaProtegida rolesPermitidos={['SUPERADMIN', 'ADMIN']} />}>
                <Route path="/categorias" element={<Categorias />} />
                <Route path="/listas-precio" element={<ListasPrecio />} />
                <Route path="/unidades" element={<Unidades />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/puntos-venta" element={<PuntosVenta />} />
                <Route path="/proveedores" element={<Proveedores />} />
                <Route path="/compras-carga" element={<ComprasCarga />} />
                <Route path="/compras-historial" element={<ComprasHistorial />} />
                <Route path="/ajuste-stock" element={<AjusteStock />} />
                <Route path="/historial-stock" element={<HistorialStock />} />
                <Route path="/stock-valorizado" element={<StockValorizado />} />
                <Route path="/facturacion" element={<Facturacion />} />
                <Route path="/notas-credito" element={<NotasCredito />} />
              </Route>

              {/* Rutas solo para SUPERADMIN */}
              <Route element={<RutaProtegida rolesPermitidos={['SUPERADMIN']} />}>
                <Route path="/parametros" element={<Parametros />} />
                <Route path="/admin/configuraciones" element={<ConfiguracionesAdmin />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
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
    </ThemeProvider>
  );
}

export default App;
