import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: string;
  comercioId: number;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  arcaLimiteMonto: number;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [arcaLimiteMonto, setArcaLimiteMonto] = useState<number>(10000000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('usuario');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUsuario(JSON.parse(storedUser));
        
        try {
          const res = await api.get('/parametros/arcaLimiteMonto', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (res.data && !isNaN(Number(res.data.valor))) {
            setArcaLimiteMonto(Number(res.data.valor));
          }
        } catch (e) {
          console.error("Error cargando arcaLimiteMonto", e);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = (newToken: string, newUser: Usuario) => {
    setToken(newToken);
    setUsuario(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('usuario', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <AuthContext.Provider value={{ usuario, token, arcaLimiteMonto, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
