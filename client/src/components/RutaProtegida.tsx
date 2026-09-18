import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RutaProtegidaProps {
  rolesPermitidos?: string[];
}

const RutaProtegida = ({ rolesPermitidos }: RutaProtegidaProps) => {
  const { token, usuario } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && usuario?.rol && !rolesPermitidos.includes(usuario.rol)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 text-gray-500">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Acceso Denegado</h2>
        <p>No tienes permisos suficientes para acceder a esta pantalla.</p>
      </div>
    );
  }

  return <Outlet />;
};

export default RutaProtegida;
