const soap = require('soap');
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

class WsfeClient {
    constructor(isProduction) {
        this.WSDL_URL = isProduction 
            ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
            : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL';
        this.client = null;
    }

    async init() {
        if (!this.client) {
            const soapOptions = {
                wsdl_options: { httpsAgent: afipHttpsAgent },
                request: axiosInstance
            };
            this.client = await soap.createClientAsync(this.WSDL_URL, soapOptions);
            this.client.setEndpoint(this.WSDL_URL);
        }
    }

    getAuth(token, sign, cuit) {
        return {
            Auth: {
                Token: { $value: token },
                Sign: { $value: sign },
                Cuit: cuit
            }
        };
    }

    handleResponseError(response, methodName) {
        if (!response) {
            throw new Error(`Respuesta vacía de ${methodName}`);
        }
        
        const resultKey = Object.keys(response).find(k => k.endsWith('Result'));
        const res = resultKey ? response[resultKey] : response;

        if (res.Errors && res.Errors.Err) {
            const err = Array.isArray(res.Errors.Err) ? res.Errors.Err[0] : res.Errors.Err;
            throw new Error(`Error SOAP ARCA (${err.Code}): ${err.Msg}`);
        }
        return res;
    }

    async FEDummy() {
        await this.init();
        try {
            const [result] = await this.client.FEDummyAsync({});
            return result.FEDummyResult;
        } catch (error) {
            throw new Error(`Error en FEDummy: ${error.message || error}`);
        }
    }

    async FECompUltimoAutorizado({ token, sign, cuit, ptoVta, cbteTipo }) {
        await this.init();
        const args = {
            ...this.getAuth(token, sign, cuit),
            PtoVta: ptoVta,
            CbteTipo: cbteTipo
        };

        try {
            const [result] = await this.client.FECompUltimoAutorizadoAsync(args);
            const res = this.handleResponseError(result, 'FECompUltimoAutorizado');
            return res.CbteNro;
        } catch (error) {
            throw error;
        }
    }

    async FECAESolicitar({ token, sign, cuit, payload }) {
        await this.init();
        
        const args = {
            ...this.getAuth(token, sign, cuit),
            FeCAEReq: {
                FeCabReq: {
                    CantReg: payload.CantReg,
                    PtoVta: payload.PtoVta,
                    CbteTipo: payload.CbteTipo
                },
                FeDetReq: {
                    FECAEDetRequest: [
                        {
                            Concepto: payload.Concepto,
                            DocTipo: payload.DocTipo,
                            DocNro: payload.DocNro,
                            CbteDesde: payload.CbteDesde,
                            CbteHasta: payload.CbteHasta,
                            CbteFch: payload.CbteFch,
                            ImpTotal: payload.ImpTotal,
                            ImpTotConc: payload.ImpTotConc,
                            ImpNeto: payload.ImpNeto,
                            ImpOpEx: payload.ImpOpEx,
                            ImpTrib: payload.ImpTrib,
                            ImpIVA: payload.ImpIVA,
                            MonId: payload.MonId,
                            MonCotiz: payload.MonCotiz
                        }
                    ]
                }
            }
        };

        try {
            const [result] = await this.client.FECAESolicitarAsync(args);
            const res = this.handleResponseError(result, 'FECAESolicitar');
            
            const detail = Array.isArray(res.FeDetResp.FECAEDetResponse) 
                ? res.FeDetResp.FECAEDetResponse[0] 
                : res.FeDetResp.FECAEDetResponse;

            if (detail.Resultado === 'R') {
                const obs = Array.isArray(detail.Observaciones?.Obs) 
                    ? detail.Observaciones.Obs[0] 
                    : detail.Observaciones?.Obs;
                const obsMsg = obs ? `(${obs.Code}) ${obs.Msg}` : 'Rechazado sin observaciones explícitas.';
                throw new Error(`Comprobante rechazado por ARCA: ${obsMsg}`);
            }

            return {
                cae: detail.CAE,
                vencimientoCae: detail.CAEFchVto
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = WsfeClient;
