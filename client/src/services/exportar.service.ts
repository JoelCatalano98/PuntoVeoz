import * as XLSX from 'xlsx';

export function exportarProductosExcel(productos: any[]) {
  const datos = productos.map(p => ({
    Nombre: p.nombre,
    Categoría: p.categoria?.nombre ?? '',
    'Unidad de Medida': p.unidadMedida?.nombre ?? '',
    'Precio de Costo': p.precioCosto,
    'Precio de Venta': p.precioVenta,
    'Stock Actual': p.stockActual,
    'Stock Mínimo': p.stockMinimo,
    'Código de Barras': p.codigoBarras ?? ''
  }));

  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Productos');
  XLSX.writeFile(libro, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
}
