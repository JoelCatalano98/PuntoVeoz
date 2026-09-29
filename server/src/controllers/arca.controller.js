const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

async function getPuntosVenta(req, res, next) {
    try {
        const comercioId = req.user.comercioId;
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
        const comercioId = req.user.comercioId;
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
        const comercioId = req.user.comercioId;
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
        const comercioId = req.user.comercioId;
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
        const comercioId = req.user.comercioId;
        
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

async function sincronizarPuntosVenta(req, res, next) {
    try {
        const comercioId = req.user.comercioId;
        const arcaService = require('../services/arca.service');
        
        // Llamada a AFIP
        let result;
        try {
            result = await arcaService.obtenerPuntosVenta(comercioId);
        } catch (afipError) {
            // Capturar errores genéricos de SOAP (ej: no hay puntos de venta asociados al CUIT)
            return res.status(400).json({ error: afipError.message || 'Error al comunicarse con ARCA' });
        }
        
        if (!result || !result.PtoVenta) {
            return res.status(400).json({ error: 'ARCA no devolvió puntos de venta válidos.' });
        }

        console.log("=== LOG TEMPORAL CRUDO ARCA ===");
        console.log(JSON.stringify(result.PtoVenta, null, 2));
        console.log("===============================");

        const ptosAfip = Array.isArray(result.PtoVenta) ? result.PtoVenta : [result.PtoVenta];
        
        const ptosActivosNumeros = [];
        const conflictos = [];
        const procesados = [];

        await prisma.$transaction(async (tx) => {
            for (const pvAfip of ptosAfip) {
                const numero = Number(pvAfip.Nro);
                ptosActivosNumeros.push(numero);
                
                const isBaja = pvAfip.FchBaja && pvAfip.FchBaja !== 'NULL';
                const isBloqueado = pvAfip.Bloqueado === 'Y';
                const activo = !isBaja && !isBloqueado;

                const existing = await tx.puntoVenta.findFirst({
                    where: { comercioId, numero }
                });

                if (existing) {
                    if (existing.tipo === 'MANUAL') {
                        conflictos.push({
                            numero,
                            motivo: 'Existe un Punto de Venta MANUAL con este mismo número. Debe renumerarlo para evitar conflictos con ARCA.'
                        });
                        continue;
                    }

                    // Es WEBSERVICE: Actualizar preservando el nombre/descripcion local y manteniendo consistencia con numeroArca
                    await tx.puntoVenta.update({
                        where: { id: existing.id },
                        data: {
                            numeroArca: numero, // Mantenemos consistente aunque no se use
                            activo: activo
                        }
                    });
                    procesados.push({ numero, activo, motivo: 'Actualizado' });
                } else {
                    // Crear nuevo
                    await tx.puntoVenta.create({
                        data: {
                            comercioId,
                            numero,
                            numeroArca: numero, // Mantenemos consistente
                            descripcion: `Punto de venta ${numero}`, // No usar EmisionTipo
                            tipo: 'WEBSERVICE',
                            activo: activo
                        }
                    });
                    procesados.push({ numero, activo, motivo: 'Creado' });
                }
            }

            // Marcar inactivos los WEBSERVICE que no vinieron en la respuesta de AFIP
            await tx.puntoVenta.updateMany({
                where: {
                    comercioId,
                    tipo: 'WEBSERVICE',
                    numero: { notIn: ptosActivosNumeros }
                },
                data: { activo: false }
            });
        });

        res.json({ success: true, count: ptosAfip.length, procesados, conflictos });
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
    sincronizarPuntosVenta,
    getStatusCertificados
};
