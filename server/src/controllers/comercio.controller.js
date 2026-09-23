const prisma = require('../config/prisma');
const cryptoService = require('../services/crypto.service');
const forge = require('node-forge');

async function getArcaConfig(req, res, next) {
    try {
        const comercioId = req.comercioId;
        const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
        if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado' });

        res.json({
            arcaCuit: comercio.arcaCuit || '',
            arcaPtoVta: comercio.arcaPtoVta || '',
            arcaModo: comercio.arcaModo || 'homologacion',
            certCargado: !!comercio.arcaCertEncrypted && !!comercio.arcaKeyEncrypted,
            uploadedAt: comercio.arcaCertUploadedAt
        });
    } catch (error) {
        next(error);
    }
}

async function postArcaConfig(req, res, next) {
    try {
        const comercioId = req.comercioId;
        const { cert, key, cuit, modo, ptoVta } = req.body;

        let arcaCertEncrypted = undefined;
        let arcaKeyEncrypted = undefined;
        let arcaCertUploadedAt = undefined;

        if (cert && key) {
            try {
                // 1. Validar parseando con forge
                const certForge = forge.pki.certificateFromPem(cert);
                const keyForge = forge.pki.privateKeyFromPem(key);

                // 2. Validar que el módulo coincida (par válido)
                const certModulus = certForge.publicKey.n.toString(16);
                const keyModulus = keyForge.n.toString(16);

                if (certModulus !== keyModulus) {
                    return res.status(400).json({ error: 'El certificado (.crt) y la llave privada (.key) proporcionados no coinciden (no son un par válido).' });
                }

                // 3. Encriptar
                arcaCertEncrypted = cryptoService.encryptAES(cert);
                arcaKeyEncrypted = cryptoService.encryptAES(key);
                arcaCertUploadedAt = new Date();

            } catch (err) {
                return res.status(400).json({ error: 'El formato del certificado o la llave privada es inválido o corrupto.' });
            }
        }

        const comercio = await prisma.comercio.update({
            where: { id: comercioId },
            data: {
                arcaCuit: cuit || null,
                arcaPtoVta: ptoVta ? Number(ptoVta) : null,
                arcaModo: modo || 'homologacion',
                ...(arcaCertEncrypted !== undefined && { arcaCertEncrypted }),
                ...(arcaKeyEncrypted !== undefined && { arcaKeyEncrypted }),
                ...(arcaCertUploadedAt !== undefined && { arcaCertUploadedAt })
            }
        });

        // Limpiar la caché de tokens, porque si se cambió el entorno (modo) 
        // o las credenciales, el token viejo ya no sirve (ej. token de homologación en prod)
        await prisma.arcaToken.deleteMany({
            where: { comercioId }
        });

        res.json({
            arcaCuit: comercio.arcaCuit,
            arcaPtoVta: comercio.arcaPtoVta,
            arcaModo: comercio.arcaModo,
            certCargado: !!comercio.arcaCertEncrypted && !!comercio.arcaKeyEncrypted,
            uploadedAt: comercio.arcaCertUploadedAt
        });
    } catch (error) {
        next(error);
    }
}

async function deleteArcaTokens(req, res, next) {
    try {
        const comercioId = req.comercioId;
        await prisma.arcaToken.deleteMany({
            where: { comercioId }
        });
        res.json({ message: 'Tokens purgados con éxito' });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getArcaConfig,
    postArcaConfig,
    deleteArcaTokens
};
