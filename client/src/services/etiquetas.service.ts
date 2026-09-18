import JsBarcode from 'jsbarcode';
import api from './api';

interface EtiquetaItem {
  producto: {
    nombre: string;
    precioVenta: number | string;
    codigoBarras?: string;
  };
  cantidad: number;
}

export function imprimirEtiquetas(items: EtiquetaItem[]) {
  const ventana = window.open('', 'PRINT', 'height=600,width=800');
  if (!ventana) return;

  let contenidoHtml = `
    <html>
      <head>
        <title>Imprimir Etiquetas</title>
        <style>
          @page { margin: 0; size: auto; }
          body { 
            margin: 0; 
            padding: 10px; 
            font-family: monospace; 
            display: flex; 
            flex-wrap: wrap; 
            gap: 10px;
          }
          .etiqueta {
            width: 5cm;
            height: 2.5cm;
            border: 1px dashed #ccc;
            padding: 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .nombre { font-size: 10px; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
          .precio { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .barcode { width: 100%; height: auto; max-height: 40px; }
        </style>
      </head>
      <body>
  `;

  api.get('/parametros/etiquetaMostrarPrecio').then(res => {
    const mostrarPrecio = res.data?.valor === 'true';

    items.forEach(item => {
      let imgData = '';
      if (item.producto.codigoBarras) {
        const canvas = document.createElement('canvas');
        try {
          JsBarcode(canvas, item.producto.codigoBarras, {
            format: 'EAN13',
            width: 2,
            height: 40,
            displayValue: true,
            fontSize: 12,
            margin: 0
          });
          imgData = canvas.toDataURL('image/png');
        } catch (e) {
          try {
            JsBarcode(canvas, item.producto.codigoBarras, {
              format: 'CODE128',
              width: 2,
              height: 40,
              displayValue: true,
              fontSize: 12,
              margin: 0
            });
            imgData = canvas.toDataURL('image/png');
          } catch (error) {}
        }
      }

      for (let i = 0; i < item.cantidad; i++) {
        contenidoHtml += `
          <div class="etiqueta">
            <div class="nombre">${item.producto.nombre}</div>
            ${mostrarPrecio ? `<div class="precio">$${Number(item.producto.precioVenta).toFixed(2)}</div>` : ''}
            ${imgData ? `<img class="barcode" src="${imgData}" />` : ''}
          </div>
        `;
      }
    });

    contenidoHtml += `
        </body>
      </html>
    `;

    ventana.document.write(contenidoHtml);
    ventana.document.close();
    ventana.focus();

    // Dar tiempo para que el DOM y las imagenes terminen de parsearse
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 250);
  }).catch(() => {
    ventana.close();
    console.error("Error al cargar parámetro de etiqueta");
  });
}
