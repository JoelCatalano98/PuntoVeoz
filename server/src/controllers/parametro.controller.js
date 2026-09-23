const prisma = require('../config/prisma');
const cryptoService = require('../services/crypto.service');
const fs = require('fs');
const path = require('path');

async function listar(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const parametros = await prisma.parametro.findMany({
      where: { comercioId }
    });
    res.json(parametros);
  } catch (error) {
    next(error);
  }
}

async function obtenerUno(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { clave } = req.params;

    const parametro = await prisma.parametro.findUnique({
      where: {
        comercioId_clave: { comercioId, clave }
      }
    });

    if (parametro) {
      return res.json({ clave: parametro.clave, valor: parametro.valor });
    }

    // Default fallbacks instead of 404
    if (clave === 'impresionTicket') {
      return res.json({ clave, valor: 'PREGUNTAR' });
    }
    if (clave === 'etiquetaMostrarPrecio') {
      return res.json({ clave, valor: 'false' });
    }

    return res.json({ clave, valor: null });
  } catch (error) {
    next(error);
  }
}

async function guardar(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { clave } = req.params;
    const { valor } = req.body;

    if (valor === undefined) {
      return res.status(400).json({ error: 'El valor es requerido' });
    }

    const parametro = await prisma.parametro.upsert({
      where: {
        comercioId_clave: { comercioId, clave }
      },
      update: { valor },
      create: { comercioId, clave, valor }
    });

    res.json(parametro);
  } catch (error) {
    next(error);
  }
}

  async function generarCSR(req, res, next) {
  try {
    const comercioId = req.comercioId;

    // Obtener CUIT y Razón Social del comercio
    const [comercio, razonSocialParam] = await Promise.all([
      prisma.comercio.findUnique({ where: { id: comercioId } }),
      prisma.parametro.findUnique({ where: { comercioId_clave: { comercioId, clave: 'empresaRazonSocial' } } })
    ]);

    const cuit = comercio?.arcaCuit;
    const razonSocial = razonSocialParam?.valor;

    if (!cuit) {
      return res.status(400).json({ error: 'Falta configurar el CUIT Emisor de ARCA en la configuración fiscal' });
    }

    const { privateKeyPem, csrPem } = cryptoService.generarCredencialesARCA(cuit, razonSocial);

    // Guardar en la carpeta server/certs
    const certsDir = path.join(__dirname, '../../certs');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    const keyPath = path.join(certsDir, 'arca.key');
    const csrPath = path.join(certsDir, 'arca.csr');

    fs.writeFileSync(keyPath, privateKeyPem);
    fs.writeFileSync(csrPath, csrPem);

    const serverPath = path.resolve(certsDir);

    res.json({
      privateKey: privateKeyPem,
      csr: csrPem,
      savedPath: serverPath
    });
  } catch (error) {
    console.error('Error al generar CSR:', error);
    next(error);
  }
}

async function getArcaConfig(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const comercio = await prisma.comercio.findUnique({ where: { id: comercioId } });
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado' });

    res.json({
      arcaCuit: comercio.arcaCuit || '',
      arcaPtoVta: comercio.arcaPtoVta || '',
      arcaModo: comercio.arcaModo || 'homologacion'
    });
  } catch (error) {
    next(error);
  }
}

async function updateArcaConfig(req, res, next) {
  try {
    const comercioId = req.comercioId;
    const { arcaCuit, arcaPtoVta, arcaModo } = req.body;

    const comercio = await prisma.comercio.update({
      where: { id: comercioId },
      data: {
        arcaCuit: arcaCuit || null,
        arcaPtoVta: arcaPtoVta ? Number(arcaPtoVta) : null,
        arcaModo: arcaModo || 'homologacion'
      }
    });

    res.json({
      arcaCuit: comercio.arcaCuit,
      arcaPtoVta: comercio.arcaPtoVta,
      arcaModo: comercio.arcaModo
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerUno,
  guardar,
  generarCSR,
  getArcaConfig,
  updateArcaConfig
};
