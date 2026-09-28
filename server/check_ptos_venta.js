const WsaaClient = require('./src/services/afip/wsaa');
const prisma = require('./src/config/prisma');

async function checkPtosVenta() {
  try {
    const comercio = await prisma.comercio.findUnique({ where: { id: 1 } });
    const wsaa = new WsaaClient(comercio, 'wsfe');
    const client = await wsaa.getWsfeClient();
    const token = await wsaa.getAuthToken();
    
    client.FEParamGetPtosVenta({
      Auth: {
        Token: token.token,
        Sign: token.sign,
        Cuit: comercio.cuit
      }
    }, async (err, result) => {
      if (err) {
        console.error('Error in FEParamGetPtosVenta:', err);
      } else {
        console.log('Result from FEParamGetPtosVenta:', JSON.stringify(result, null, 2));
      }
      
      const pvs = await prisma.puntoVenta.findMany({ where: { comercioId: 1 } });
      console.log('\nRows in PuntoVenta table:');
      console.table(pvs.map(pv => ({ id: pv.id, numero: pv.numero, tipo: pv.tipo, nombre: pv.nombre })));
    });
  } catch (error) {
    console.error(error);
  }
}

checkPtosVenta();
