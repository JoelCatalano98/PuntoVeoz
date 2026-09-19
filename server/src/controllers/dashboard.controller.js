const prisma = require('../config/prisma');

async function obtenerResumen(req, res, next) {
  try {
    const comercioId = req.comercioId;
    let { fechaDesde, fechaHasta } = req.query;

    const ahora = new Date();
    
    // Rango por defecto: mes actual
    let desde = fechaDesde ? new Date(fechaDesde) : new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    let hasta = fechaHasta ? new Date(fechaHasta) : new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);

    // Ajuste de horas si es exactamente la misma fecha, por ejemplo "Hoy"
    // El frontend enviará los rangos con horas 00:00:00 y 23:59:59 pero por las dudas aseguramos el rango
    // si el input es "YYYY-MM-DD" puro
    if (fechaDesde && fechaDesde.length <= 10) {
      desde = new Date(fechaDesde + 'T00:00:00.000');
    }
    if (fechaHasta && fechaHasta.length <= 10) {
      hasta = new Date(fechaHasta + 'T23:59:59.999');
    }

    const whereClause = {
      comercioId,
      anulada: false,
      createdAt: {
        gte: desde,
        lte: hasta,
      },
    };

    // 1. KPIs Principales
    const kpis = await prisma.venta.aggregate({
      where: whereClause,
      _sum: { total: true },
      _count: { id: true },
    });

    const totalFacturado = Number(kpis._sum.total || 0);
    const cantidadVentas = kpis._count.id;
    const ticketPromedio = cantidadVentas > 0 ? totalFacturado / cantidadVentas : 0;

    // 2. Ventas por Método de Pago
    const agrupadoPagos = await prisma.venta.groupBy({
      by: ['medioPago'],
      where: whereClause,
      _sum: { total: true },
    });

    const ventasPorMetodo = {};
    agrupadoPagos.forEach(item => {
      ventasPorMetodo[item.medioPago] = Number(item._sum.total || 0);
    });

    // 3. Top Productos (A través de VentaItem)
    const agrupadoProductos = await prisma.ventaItem.groupBy({
      by: ['productoId'],
      where: {
        venta: whereClause
      },
      _sum: {
        cantidad: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: 10
    });

    // Como prisma groupBy no permite include, buscamos los nombres
    const productoIds = agrupadoProductos.map(p => p.productoId);
    let topProductos = [];

    if (productoIds.length > 0) {
      const productos = await prisma.producto.findMany({
        where: { id: { in: productoIds }, comercioId },
        select: { id: true, nombre: true }
      });
      
      const mapProductos = {};
      productos.forEach(p => mapProductos[p.id] = p.nombre);

      topProductos = agrupadoProductos.map(item => ({
        id: item.productoId,
        nombre: mapProductos[item.productoId] || 'Producto Eliminado',
        cantidad: Number(item._sum.cantidad || 0),
        recaudado: Number(item._sum.subtotal || 0)
      }));
    }

    res.json({
      desde,
      hasta,
      totalFacturado,
      cantidadVentas,
      ticketPromedio,
      ventasPorMetodo,
      topProductos
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  obtenerResumen
};
