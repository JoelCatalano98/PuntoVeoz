import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
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
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: '#042C53', marginBottom: '1.5rem', fontSize: '24px' }}>Punto Veloz</h2>
        {error && <div style={{ color: '#d32f2f', backgroundColor: '#fdecea', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center', fontSize: '14px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '14px', fontWeight: 500 }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '14px', fontWeight: 500 }}>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.85rem', backgroundColor: '#85B7EB', color: '#042C53', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '0.5rem', transition: 'background-color 0.2s' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
