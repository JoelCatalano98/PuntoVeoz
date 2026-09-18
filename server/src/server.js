require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar rutas (las dejamos preparadas para los siguientes pasos)
const authRoutes = require('./routes/auth.routes');
const productoRoutes = require('./routes/producto.routes');
const ventaRoutes = require('./routes/venta.routes');
const cajaRoutes = require('./routes/caja.routes');
const clienteRoutes = require('./routes/cliente.routes');
const puntoVentaRoutes = require('./routes/puntoventa.routes');
const cajaMaestroRoutes = require('./routes/caja-maestro.routes');
const parametroRoutes = require('./routes/parametro.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const unidadMedidaRoutes = require('./routes/unidad-medida.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const compraRoutes = require('./routes/compra.routes');
const stockRoutes = require('./routes/stock.routes');
const listaPrecioRoutes = require('./routes/listaPrecio.routes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '../public')));

// Montar rutas bajo /api (descomentaremos a medida que las creemos)
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/puntos-venta', puntoVentaRoutes);
app.use('/api/cajas-maestro', cajaMaestroRoutes);
app.use('/api/parametros', parametroRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/unidades-medida', unidadMedidaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/listas-precio', listaPrecioRoutes);

// Endpoint de prueba (Health Check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API de Punto Veloz funcionando' });
});

// Middleware de manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    error: true,
    message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor de Punto Veloz corriendo en el puerto ${PORT}`);
});
