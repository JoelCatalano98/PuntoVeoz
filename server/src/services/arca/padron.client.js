const wsaaClient = require('./wsaa.client');
const soap = require('soap');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios');

// Mismos agentes que wsfe.client.js para ignorar self-signed certs o TLS viejos que AFIP usa
const afipHttpsAgent = new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    ciphers: 'DEFAULT:@SECLEVEL=0',
    rejectUnauthorized: false
});

const axiosInstance = axios.create({
    httpsAgent: afipHttpsAgent
});

class PadronClient {
    constructor() {}

    /**
     * Consulta el Padrón A5 de AFIP usando ws_sr_constancia_inscripcion.
     */
    async consultarCUIT(comercioId, cuitAConsultar, cuitRepresentada, isProduction) {
        // Pedimos token para el servicio "ws_sr_constancia_inscripcion"
        const service = 'ws_sr_constancia_inscripcion';
        
        // Asume que los paths de certificados son los mismos que en wsaa.client.js o se sacan de DB
        const path = require('path');
        const certPath = path.resolve(__dirname, '../../../certs/arca.crt');
        const keyPath = path.resolve(__dirname, '../../../certs/arca.key');

        const auth = await wsaaClient.getToken({
            comercioId,
            certPath,
            keyPath,
            isProduction,
            service
        });

        const WSDL_URL = isProduction 
            ? 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5?WSDL'
            : 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5?WSDL';

        try {
            const soapOptions = {
                wsdl_options: { httpsAgent: afipHttpsAgent },
                request: axiosInstance
            };

            const client = await soap.createClientAsync(WSDL_URL, soapOptions);
            client.setEndpoint(WSDL_URL);

            const args = {
                token: auth.token,
                sign: auth.sign,
                cuitRepresentada: Number(cuitRepresentada),
                idPersona: Number(cuitAConsultar)
            };

            const [result] = await client.getPersonaAsync(args);
            
            if (!result || !result.personaReturn) {
                return { success: false, error: 'Respuesta vacía de AFIP' };
            }

            const p = result.personaReturn;

            // Manejo de errores oficiales del servicio
            if (p.errorConstancia) {
                // errorConstancia.error puede ser string o array
                const err = Array.isArray(p.errorConstancia.error) 
                    ? p.errorConstancia.error.join(' | ') 
                    : p.errorConstancia.error;
                return { success: false, error: err };
            }

            // Mapeo de datos
            const datosGenerales = p.datosGenerales || {};
            const dom = datosGenerales.domicilioFiscal || {};
            
            // Deducir Condicion de IVA usando tabla de mapeo (null si no hay coincidencia)
            let condicionIva = null;

            const impuestosRG = p.datosRegimenGeneral?.impuesto || [];
            const impuestosMono = p.datosMonotributo?.impuesto || [];

            // Convertir a array si AFIP devuelve un solo objeto en vez de array
            const rgArr = Array.isArray(impuestosRG) ? impuestosRG : (Object.keys(impuestosRG).length ? [impuestosRG] : []);
            const monoArr = Array.isArray(impuestosMono) ? impuestosMono : (Object.keys(impuestosMono).length ? [impuestosMono] : []);

            // Tabla explícita de mapeo (idImpuesto -> Condición IVA)
            const MAPEO_IMPUESTOS = {
                30: 'IVA Responsable Inscripto',
                32: 'IVA Exento',
                34: 'IVA No Alcanzado'
            };

            // 1. Priorizamos buscar en la tabla de Régimen General
            for (const imp of rgArr) {
                if (imp && MAPEO_IMPUESTOS[imp.idImpuesto]) {
                    condicionIva = MAPEO_IMPUESTOS[imp.idImpuesto];
                    break;
                }
            }

            // 2. Si no es del Régimen General, buscamos si es Monotributista (impuesto 20)
            if (!condicionIva) {
                const esMonotributista = monoArr.some(imp => imp && imp.idImpuesto === 20);
                if (esMonotributista) {
                    condicionIva = 'Responsable Monotributo';
                }
            }

            return {
                success: true,
                nombre: datosGenerales.razonSocial || datosGenerales.nombre || datosGenerales.apellido || '',
                direccion: dom.direccion ? `${dom.direccion}, ${dom.localidad || ''}`.trim().replace(/,\s*$/, '') : '',
                condicionIva,
                _raw: p // Devolvemos el raw para la prueba solicitada por el usuario
            };

        } catch (error) {
            let msg = error.message;
            if (error.Fault) {
                msg = error.Fault.faultstring || error.Fault.faultcode || msg;
            }
            return { success: false, error: `Error SOAP AFIP: ${msg}` };
        }
    }
}

module.exports = new PadronClient();
