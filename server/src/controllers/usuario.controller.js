const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

async function listar(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { comercioId: req.comercioId, activo: true },
      select: {
        id: true,
        nombre: true,
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
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usuario = await prisma.usuario.create({
      data: {
        comercioId: req.comercioId,
        nombre,
        email,
        passwordHash,
        rol
      },
      select: { id: true, nombre: true, email: true, rol: true }
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol, activo } = req.body;

    const usuario = await prisma.usuario.findFirst({
      where: { id: Number(id), comercioId: req.comercioId }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (email && email !== usuario.email) {
      const emailEnUso = await prisma.usuario.findUnique({ where: { email } });
      if (emailEnUso) {
        return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }

    const data = { nombre, email, rol, activo };

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(password, salt);
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true }
    });

    res.json(actualizado);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, crear, actualizar };
