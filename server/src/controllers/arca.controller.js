const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

async function getPuntosVenta(req, res, next) {
    try {
        const comercioId = req.comercioId;
        const puntosVenta = await prisma.puntoVenta.findMany({
            where: { comercioId }
        });
        res.json(puntosVenta);
    } catch (error) {
        next(error);
    }
}

async function getPuntoVenta(req, res, next) {
    try {
        const { id } = req.params;
        const comercioId = req.comercioId;
        const puntoVenta = await prisma.puntoVenta.findFirst({
            where: { id: Number(id), comercioId }
        });
        if (!puntoVenta) return res.status(404).json({ error: 'Punto de venta no encontrado' });
        res.json(puntoVenta);
    } catch (error) {
        next(error);
    }
}

async function createPuntoVenta(req, res, next) {
    try {
        const comercioId = req.comercioId;
        const { numero, descripcion, nombre, tipo, numeroArca, activo } = req.body;
        const newPuntoVenta = await prisma.puntoVenta.create({
            data: {
                comercioId,
                numero: numero !== undefined ? Number(numero) : undefined,
                descripcion,
                nombre,
                tipo,
                numeroArca: numeroArca !== undefined ? Number(numeroArca) : (numero !== undefined ? Number(numero) : undefined),
                activo: activo !== undefined ? activo : true
            }
        });
        res.status(201).json(newPuntoVenta);
    } catch (error) {
        next(error);
    }
}

async function updatePuntoVenta(req, res, next) {
    try {
        const { id } = req.params;
        const comercioId = req.comercioId;
        const { numero, descripcion, nombre, tipo, numeroArca, activo } = req.body;

        const puntoVenta = await prisma.puntoVenta.findFirst({
            where: { id: Number(id), comercioId }
        });
        if (!puntoVenta) return res.status(404).json({ error: 'Punto de venta no encontrado' });

        const updatedPuntoVenta = await prisma.puntoVenta.update({
            where: { id: Number(id) },
            data: {
                numero: numero !== undefined ? Number(numero) : undefined,
                descripcion,
                nombre,
                tipo,
                numeroArca: numeroArca !== undefined ? Number(numeroArca) : undefined,
                activo
            }
        });
        res.json(updatedPuntoVenta);
    } catch (error) {
        next(error);
    }
}

async function deletePuntoVenta(req, res, next) {
    try {
        const { id } = req.params;
        const comercioId = req.comercioId;
        
        const puntoVenta = await prisma.puntoVenta.findFirst({
            where: { id: Number(id), comercioId }
        });
        if (!puntoVenta) return res.status(404).json({ error: 'Punto de venta no encontrado' });

        await prisma.puntoVenta.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}

async function getStatusCertificados(req, res, next) {
    try {
        const certPath = path.resolve(__dirname, '../../certs/arca.crt');
        const keyPath = path.resolve(__dirname, '../../certs/arca.key');

        const certExists = fs.existsSync(certPath);
        const keyExists = fs.existsSync(keyPath);

        res.json({
            certExists,
            keyExists
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getPuntosVenta,
    getPuntoVenta,
    createPuntoVenta,
    updatePuntoVenta,
    deletePuntoVenta,
    getStatusCertificados
};
