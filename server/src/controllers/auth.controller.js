const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: true, message: 'Usuario y contraseña son requeridos' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { username }
    });

    if (!usuario) {
      return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: true, message: 'Usuario inactivo' });
    }

    const isPasswordValid = await bcrypt.compare(password, usuario.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    }

    const payload = {
      userId: usuario.id,
      comercioId: usuario.comercioId,
      rol: usuario.rol
    };

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.json({
      error: false,
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol,
        comercioId: usuario.comercioId
      }
    });

  } catch (error) {
    next(error); // Pasa el error al middleware global de server.js
  }
};

module.exports = {
  login
};
