const forge = require('node-forge');
const fs = require('fs');
const soap = require('soap');
const prisma = require('../../config/prisma');
const cryptoService = require('../crypto.service');
const https = require('https');
const crypto = require('crypto');
const tls = require('tls');
const axios = require('axios');
tls.DEFAULT_MIN_VERSION = 'TLSv1';

const afipHttpsAgent = new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    ciphers: 'DEFAULT:@SECLEVEL=0',
    rejectUnauthorized: false
});

const axiosInstance = axios.create({
    httpsAgent: afipHttpsAgent
});

class WsaaClient {
    constructor() {}

    async getToken({ comercioId, certPath, keyPath, isProduction, service }) {
        const tokenCacheado = await prisma.arcaToken.findUnique({
            where: { comercioId_service: { comercioId, service } }
        });

        const margenMinutos = 5;
        const ahora = new Date();
        ahora.setMinutes(ahora.getMinutes() + margenMinutos);

        if (tokenCacheado && tokenCacheado.expirationTime > ahora) {
            return {
                token: tokenCacheado.token,
                sign: tokenCacheado.sign,
                expirationTime: tokenCacheado.expirationTime
            };
        }

        // Obtener comercio para ver si tiene los certificados en DB
        const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
        let certContent = null;
        let keyContent = null;

        if (comercio?.arcaCertEncrypted && comercio?.arcaKeyEncrypted) {
            // Desencriptar desde DB
            certContent = cryptoService.decryptAES(comercio.arcaCertEncrypted);
            keyContent = cryptoService.decryptAES(comercio.arcaKeyEncrypted);
        } else {
            // Fallback a archivos locales
            if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
                throw new Error(`Faltan los archivos de certificado para WSAA en el servidor y tampoco están en la Base de Datos.`);
            }
            certContent = fs.readFileSync(certPath, 'utf8');
            keyContent = fs.readFileSync(keyPath, 'utf8');
        }

        const tra = this.generarTRA(service);
        const cms = this.firmarTRA(tra, certContent, keyContent);

        const ENDPOINT_URL = isProduction 
            ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms' 
            : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
        const WSDL_URL = ENDPOINT_URL + '?WSDL';
        
        try {
            const soapOptions = {
                wsdl_options: { httpsAgent: afipHttpsAgent },
                request: axiosInstance
            };
            const client = await soap.createClientAsync(WSDL_URL, soapOptions);
            client.setEndpoint(ENDPOINT_URL);
            
            console.log(`[WSAA] Obteniendo Token contra URL EXACTA: ${ENDPOINT_URL} (isProduction: ${isProduction})`);
            const args = { in0: cms };
            const [result] = await client.loginCmsAsync(args);

            if (!result || !result.loginCmsReturn) {
                throw new Error('Respuesta inválida de WSAA');
            }

            const loginCmsReturn = result.loginCmsReturn;
            const { token, sign, expirationTime } = this.parseWsaaResponse(loginCmsReturn);

            await prisma.arcaToken.upsert({
                where: { comercioId_service: { comercioId, service } },
                update: { token, sign, expirationTime: new Date(expirationTime) },
                create: { comercioId, service, token, sign, expirationTime: new Date(expirationTime) }
            });

            return { token, sign, expirationTime: new Date(expirationTime) };
        } catch (error) {
            let msg = error.message;
            if (error.Fault) {
                msg = error.Fault.faultstring || error.Fault.faultcode || msg;
            }
            throw new Error(`Error WSAA SOAP: ${msg}`);
        }
    }

    generarTRA(service) {
        const uniqueId = Math.floor(Date.now() / 1000);
        const now = new Date();
        const genTime = new Date(now.getTime() - 10 * 60000);
        const expTime = new Date(now.getTime() + 10 * 60000);
        
        const formatISO = (date) => {
            const pad = (n) => (n < 10 ? '0' + n : n);
            const offset = -date.getTimezoneOffset();
            const sign = offset >= 0 ? '+' : '-';
            const offHours = pad(Math.floor(Math.abs(offset) / 60));
            const offMins = pad(Math.abs(offset) % 60);

            return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
                'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
                sign + offHours + ':' + offMins;
        };

        return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatISO(genTime)}</generationTime>
    <expirationTime>${formatISO(expTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
    }

    firmarTRA(traXml, certPem, keyPem) {
        const pki = forge.pki;
        const cert = pki.certificateFromPem(certPem);
        const key = pki.privateKeyFromPem(keyPem);

        const p7 = forge.pkcs7.createSignedData();
        p7.content = forge.util.createBuffer(traXml, 'utf8');
        p7.addCertificate(cert);
        p7.addSigner({
            key: key,
            certificate: cert,
            digestAlgorithm: forge.pki.oids.sha256,
            authenticatedAttributes: [
                {
                    type: forge.pki.oids.contentType,
                    value: forge.pki.oids.data
                },
                {
                    type: forge.pki.oids.messageDigest
                },
                {
                    type: forge.pki.oids.signingTime,
                    value: new Date()
                }
            ]
        });

        p7.sign();
        const pem = forge.pkcs7.messageToPem(p7);
        const lines = pem.split('\n');
        const base64 = lines.filter(l => l && !l.startsWith('-----')).join('');
        return base64;
    }

    parseWsaaResponse(xmlString) {
        const tokenMatch = xmlString.match(/<token>([\s\S]+?)<\/token>/);
        const signMatch = xmlString.match(/<sign>([\s\S]+?)<\/sign>/);
        const expMatch = xmlString.match(/<expirationTime>([\s\S]+?)<\/expirationTime>/);

        if (!tokenMatch || !signMatch || !expMatch) {
            throw new Error('No se pudo parsear el token y sign de la respuesta de WSAA');
        }

        return {
            token: tokenMatch[1],
            sign: signMatch[1],
            expirationTime: expMatch[1]
        };
    }
}

module.exports = new WsaaClient();
