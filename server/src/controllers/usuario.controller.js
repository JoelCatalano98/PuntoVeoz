const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

const ROLES_VALIDOS = ['SUPERADMIN', 'ADMIN', 'CAJERO'];

async function listar(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { comercioId: req.comercioId, activo: true },
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      }
    });
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, username, email, password, rol } = req.body;

    if (!nombre || !username || !email || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (rol === 'SUPERADMIN' && req.user.rol !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Solo un SUPERADMIN puede asignar el rol SUPERADMIN' });
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email o nombre de usuario' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usuario = await prisma.usuario.create({
      data: {
        comercioId: req.comercioId,
        nombre,
        username,
        email,
        password: passwordHash,
        rol
      },
      select: { id: true, nombre: true, username: true, email: true, rol: true }
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, username, email, password, rol, activo } = req.body;

    const usuario = await prisma.usuario.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.rol === 'SUPERADMIN' && req.user.rol !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'No autorizado para modificar esta cuenta' });
    }

    if (rol) {
      if (!ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      if (rol === 'SUPERADMIN' && req.user.rol !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Solo un SUPERADMIN puede asignar el rol SUPERADMIN' });
      }
    }

    if (email && email !== usuario.email) {
      const emailEnUso = await prisma.usuario.findUnique({ where: { email } });
      if (emailEnUso) {
        return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }
    
    if (username && username !== usuario.username) {
      const usernameEnUso = await prisma.usuario.findUnique({ where: { username } });
      if (usernameEnUso) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }

    const data = { nombre, username, email, rol, activo };

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data,
      select: { id: true, nombre: true, username: true, email: true, rol: true, activo: true }
    });

    res.json(actualizado);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, crear, actualizar };
