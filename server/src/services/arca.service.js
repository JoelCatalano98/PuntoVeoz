const prisma = require('../config/prisma');
const wsaaClient = require('./arca/wsaa.client');
const WsfeClient = require('./arca/wsfe.client');
const path = require('path');

class ArcaService {
    /**
     * Prepara el entorno para un comercio y retorna la instancia del cliente WSFE
     */
    async getAuthTokens(comercioId) {
        const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
        if (!comercio) throw new Error('Comercio no encontrado');
        if (!comercio.arcaCuit) throw new Error('El CUIT no está configurado en los parámetros.');

        const cuitNumber = Number(comercio.arcaCuit);
        if (!cuitNumber || isNaN(cuitNumber)) {
            throw new Error("El CUIT configurado no es válido.");
        }

        const isProduction = comercio.arcaModo === 'produccion';
        const certPath = path.resolve(__dirname, '../../certs/arca.crt');
        const keyPath = path.resolve(__dirname, '../../certs/arca.key');

        const auth = await wsaaClient.getToken({
            comercioId,
            certPath,
            keyPath,
            isProduction,
            service: 'wsfe'
        });

        const wsfe = new WsfeClient(isProduction);
        
        return {
            wsfe,
            token: auth.token,
            sign: auth.sign,
            cuit: cuitNumber,
            comercio
        };
    }

    async obtenerUltimoComprobante(comercioId, ptoVta, tipoCbte) {
        try {
            const { wsfe, token, sign, cuit } = await this.getAuthTokens(comercioId);
            return await wsfe.FECompUltimoAutorizado({
                token,
                sign,
                cuit,
                ptoVta,
                cbteTipo: tipoCbte
            });
        } catch (error) {
            console.error('Error al obtener último comprobante en ARCA:', error);
            throw error;
        }
    }

    async emitirFactura(comercioId, datosVenta) {
        try {
            const { wsfe, token, sign, cuit, comercio } = await this.getAuthTokens(comercioId);
            
            const ptoVta = comercio?.arcaPtoVta || datosVenta.puntoVenta || 1;
            const cbteTipo = datosVenta.tipoCbte || 11;
            const concepto = datosVenta.concepto || 1;
            const docTipo = datosVenta.clienteDocTipo || 99;
            const docNro = datosVenta.clienteDocNro || 0;
            const total = datosVenta.total;
            
            // Consultar el último número correlativo
            const lastVoucher = await wsfe.FECompUltimoAutorizado({
                token, sign, cuit, ptoVta, cbteTipo
            });
            const nroFactura = lastVoucher + 1;

            const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0].replace(/-/g, '');

            const payload = {
                CantReg: 1,
                PtoVta: ptoVta,
                CbteTipo: cbteTipo,
                Concepto: concepto,
                DocTipo: docTipo,
                DocNro: docNro,
                CbteDesde: nroFactura,
                CbteHasta: nroFactura,
                CbteFch: parseInt(date),
                ImpTotal: total,
                ImpTotConc: 0,
                ImpNeto: total,
                ImpOpEx: 0,
                ImpIVA: 0,
                ImpTrib: 0,
                MonId: 'PES',
                MonCotiz: 1
            };

            // Campos OBLIGATORIOS si es un Servicio (2) o Producto+Servicio (3)
            if (concepto === 2 || concepto === 3) {
                const dateNum = parseInt(date);
                payload.FchServDesde = datosVenta.fechaServicioDesde ? parseInt(datosVenta.fechaServicioDesde) : dateNum;
                payload.FchServHasta = datosVenta.fechaServicioHasta ? parseInt(datosVenta.fechaServicioHasta) : dateNum;
                payload.FchVtoPago = datosVenta.vtoPago ? parseInt(datosVenta.vtoPago) : dateNum;
            }

            const res = await wsfe.FECAESolicitar({
                token, sign, cuit, payload
            });
            
            return {
                nroFactura: nroFactura,
                cae: res.cae,
                vencimientoCae: res.vencimientoCae
            };
        } catch (error) {
            console.error('Error al emitir factura en ARCA:', error);
            throw error;
        }
    }
}

module.exports = new ArcaService();
