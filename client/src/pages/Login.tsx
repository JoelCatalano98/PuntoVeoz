import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, usuario } = response.data;
      
      login(token, usuario);
      navigate('/ventas');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Credenciales inválidas');
      } else {
        setError('Error al iniciar sesión');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Panel Izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-end items-center pb-16 border-r border-slate-800">
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <img src="/PuntoVeloz.png" alt="Fondo" className="w-[80%] h-auto opacity-[0.03] scale-110 pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          <h1 className="text-6xl font-extrabold text-white tracking-tight drop-shadow-lg">Punto Veloz</h1>
          <p className="text-slate-400 mt-4 text-2xl font-medium drop-shadow-md">Gestión Ágil y Eficiente</p>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-6 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700/50">
          
          <div className="flex flex-col items-center justify-center mb-8 lg:hidden">
            <img src="/PuntoVeloz.png" alt="Punto Veloz Logo" className="h-24 w-auto object-contain mb-4 drop-shadow-md" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-200">Bienvenido</h2>
          </div>

          <div className="hidden lg:block mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-200">Iniciar Sesión</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Ingresá tus credenciales para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm text-center font-medium border border-red-100 dark:border-red-800/50 flex items-center justify-center gap-2 animate-shake">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Usuario
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-light focus:border-brand-light outline-none transition-all font-medium"
                placeholder="Ej: admin"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Contraseña
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-light focus:border-brand-light outline-none transition-all font-medium tracking-widest"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-4 mt-4 bg-brand-light hover:bg-blue-400 dark:bg-brand-light/90 dark:hover:bg-brand-light text-brand-dark dark:text-slate-900 font-bold text-lg rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
