const forge = require('node-forge');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

class CryptoService {
    /**
     * Genera un par de claves RSA (2048) y un certificado CSR
     * preparado para solicitar el certificado digital en ARCA/AFIP.
     * @param {string} cuit - CUIT de la empresa (ej: 30111111112)
     * @param {string} razonSocial - Nombre o Razón Social de la empresa
     * @returns {Object} { privateKeyPem, csrPem }
     */
    generarCredencialesARCA(cuit, razonSocial) {
        // Generar par de claves RSA de 2048 bits
        const keys = forge.pki.rsa.generateKeyPair(2048);

        // Crear la Solicitud de Certificado (CSR)
        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = keys.publicKey;

        // OIDs que requiere AFIP para el CSR:
        // C (Country) = AR
        // O (Organization) = Razón Social
        // CN (Common Name) = Nombre para identificar el sistema
        // serialNumber (2.5.4.5) = CUIT XXXXXXXXXXX (requerido exacto "CUIT XXXXXXXXXXX")
        const attrs = [
            {
                name: 'countryName',
                value: 'AR'
            },
            {
                name: 'organizationName',
                value: razonSocial || 'Comercio'
            },
            {
                name: 'commonName',
                value: 'PuntoVeloz_ARCA'
            },
            {
                name: 'serialNumber',
                value: `CUIT ${String(cuit).replace(/[^0-9]/g, '')}`
            }
        ];

        csr.setSubject(attrs);

        // Firmar el CSR con la clave privada
        csr.sign(keys.privateKey, forge.md.sha256.create());

        // Convertir a formato PEM
        const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
        const csrPem = forge.pki.certificationRequestToPem(csr);

        return {
            privateKeyPem,
            csrPem
        };
    }

    _getKey() {
        const key = process.env.CERT_ENCRYPTION_KEY;
        if (!key || key.length !== 32) {
            throw new Error('CERT_ENCRYPTION_KEY no configurada o longitud inválida (debe ser 32 bytes)');
        }
        return key;
    }

    encryptAES(text) {
        if (!text) return null;
        const key = this._getKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'utf8'), iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        
        // iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    decryptAES(encryptedData) {
        if (!encryptedData) return null;
        const key = this._getKey();
        const parts = encryptedData.split(':');
        if (parts.length !== 3) throw new Error('Dato encriptado con formato inválido');

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'utf8'), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
}

module.exports = new CryptoService();
