# Aliado · gestión de pequeños comercios

Aplicación web/PWA para registrar ventas, inventario, fiados, mermas y movimientos de caja. Esta versión funciona en el dispositivo y contiene una práctica con tienda ficticia; todavía no es un servicio municipal centralizado.

## Ejecutar y verificar

Node.js 20.19+ o 22.12+ compatible con Vite 8. No copiar `node_modules` entre sistemas operativos.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Para las pruebas interactivas:

```bash
npx playwright install chromium
npm run test:ui
```

La prueba de trabajo sin conexión requiere compilar y ejecutar `test:ui` con la variable `ALIADO_TEST_PRODUCCION=1`. En PowerShell: `$env:ALIADO_TEST_PRODUCCION="1"; npm run test:ui`. En Linux/macOS: `ALIADO_TEST_PRODUCCION=1 npm run test:ui`. El navegador puede indicarse mediante `ALIADO_CHROMIUM_PATH` en entornos de pruebas que ya disponen de un ejecutable compatible.

## Funciones

- Venta rápida: productos, cantidades y carrito; una confirmación guarda la venta, descuenta stock y registra cobros/deuda juntos. Carrito conservado al navegar, separado entre negocio y práctica. Los carritos no confirmados no sobreviven a recarga.
- Pago en efectivo, transferencia o fiado con abono inicial opcional. Abonos posteriores no vuelven a contar una venta. Clientes con identificación propia, sin agrupar automáticamente por nombre.
- Inventario por unidades, kg o litros. Entradas, mínimos, alertas, costo medio y ajustes con motivo. No se edita el stock directamente desde el catálogo.
- Merma vinculada a producto: descuenta stock y valor al costo, con motivo. Puede anularse si se devuelve físicamente el producto; conserva los registros y el movimiento inverso.
- Anulación completa de venta: devuelve todos sus productos y costo al inventario, revierte cobros y elimina su saldo pendiente mediante una devolución fechada. No incluye devoluciones parciales o productos que no regresen en condiciones de venta.
- Caja: fondo inicial, cobros, compras, gastos operativos, aportes y retiros. Cierre con esperado, contado y diferencia, sin inferir ventas desde el efectivo. Correcciones de gastos y abonos mediante anulaciones con motivo.
- Reportes: hoy, últimos 7 días, mes, año, historial y fechas elegidas. Ventas netas, costo vendido, margen bruto, merma, gastos y resultado operativo registrado. Clasificación por importe, margen o cantidad, filtrando unidad de medida; CSV. Historial diario y detalle de ventas/mermas.
- Respaldos versión 3, validación de estructura y reconciliación de inventario/ventas, restauración transaccional con copia anterior. Los archivos pueden contener información personal: conservarlos y compartirlos con acceso autorizado.

## Integridad y almacenamiento

Los importes se calculan en centavos enteros. Las cantidades se almacenan en milésimas, permitiendo fracciones solo para kg/litros. Los importes de líneas se redondean al centavo. El valor del inventario se conserva como un total de centavos: la salida se calcula proporcionalmente y la última salida absorbe el remanente de redondeo.

El inventario pregunta cómo se vende el producto (unidad, kilogramo o litro). Al crear o reponer, se puede indicar la cantidad directamente o convertir sacos, cajas, paquetes y bidones: número de envases × contenido de cada envase. Por ejemplo, 2 sacos de 50 kg por $80 crean 100 kg con valor total de $80. La conversión no presupone un peso por saco. El costo por unidad mostrado se aproxima a centavos, pero el valor total de la compra se conserva exactamente. El inventario inicial registra mercadería existente sin descontar caja; Reponer registra compras nuevas y su pago.

Una recarga de datos existentes usa una transacción de solo lectura. La apertura tiene un límite de espera de 8 segundos y las transacciones de 15 segundos; si el navegador no responde, se muestra un error y se permite reintentar la carga sin borrar registros. Las conexiones tardías se cierran y las operaciones que superan el límite se abortan; si no se puede confirmar el resultado, se pide revisar el historial antes de repetir. «Guardando…» indica una operación pendiente: el éxito solo aparece después de completar la transacción. Los formatos monetarios/de fecha se reutilizan y los reportes de Inicio y Reportes se recalculan al cambiar datos o periodo, evitando trabajo repetido al actualizar avisos. Estas medidas no garantizan un tiempo de respuesta determinado en cada teléfono.

En Configuración, «Hacer respaldo en WhatsApp» comparte el respaldo completo como documento .txt (su contenido sigue siendo JSON), más compatible con los formatos permitidos por Web Share. El teléfono abre el selector de aplicaciones; el usuario elige WhatsApp y el chat. Una web no puede forzar un destinatario de aplicación para compartir archivos. La restauración acepta .json y .txt y valida el mismo esquema. Si el navegador no permite compartir archivos, muestra una explicación sin descargar automáticamente; la descarga local conserva su botón separado. La entrega real en WhatsApp debe comprobarse en un teléfono compatible: las pruebas automatizadas simulan la API del sistema, no WhatsApp. No es sincronización ni respaldo remoto automático.

IndexedDB guarda el documento de negocio mediante una transacción de lectura/escritura. Una operación fallida no deja stock ni cobros parciales. El mismo identificador de operación no se procesa dos veces. Las transacciones se serializan entre pestañas y las vistas se refrescan con BroadcastChannel y al recuperar foco. La interfaz muestra éxito solo después del compromiso de la transacción.

La auditoría conserva operaciones y motivos; las anulaciones no borran originales. Es una trazabilidad local, no un registro inalterable, certificado ni auditado por servidor. No es una solución contable/fiscal oficial. Las cifras dependen de la integridad de los registros, costos aportados y gastos capturados; no incluyen impuestos o gastos omitidos.

## Datos de la versión anterior

La primera apertura migra las cinco colecciones locales antiguas a un estado versión 3. También se pueden importar respaldos válidos versión 1 o 2. Las claves originales de localStorage se conservan y una copia completa queda dentro del respaldo nuevo.

- El inventario existente se toma como saldo inicial, sin volver a descontar mermas antiguas.
- Los fiados se conservan con sus abonos y cada registro recibe un cliente independiente, para no fusionar identidades por nombre. El comerciante debe verificar la identidad de los registros importados.
- Las mermas históricas conservan el valor estimado original y se identifican como históricas; no se inventa un vínculo de producto.
- Los cierres antiguos permanecen consultables y exportables como estimaciones separadas. No se convierten en ventas por producto ni en utilidad.
- Datos inválidos bloquean la migración sin sobrescribir originales. La pantalla permite exportar los originales y restaurar un respaldo válido.
- Los respaldos versión 3 no deben importarse en versiones antiguas de la app.

## Práctica integrada

El botón **Probar tienda ficticia** abre una simulación en memoria, separada del negocio real. Permite vender, reponer, registrar merma, cobrar fiados y consultar reportes. Reiniciar devuelve la simulación al ejemplo inicial; salir vuelve a los datos reales.

Ejemplo inicial del día: 10 leches a costo $0,70 y venta $1,00; 20 panes; 10 kg de arroz; caja inicial $20,00. Se registran una venta en efectivo, una venta fiada, un abono, una merma, reposición, una venta por peso con transferencia, un gasto y un retiro.

| Indicador | Resultado esperado |
| --- | ---: |
| Ventas | $6,75 |
| Costo vendido | $4,60 |
| Margen bruto | $2,15 |
| Merma | $0,70 |
| Gastos | $0,50 |
| Resultado operativo registrado | $0,95 |
| Fiado pendiente | $2,00 |
| Leches disponibles | 9 |
| Valor de esas leches | $6,80 |
| Efectivo esperado y contado | $18,50 |

## Antes de un piloto municipal

Faltan cuentas/permisos, backend, sincronización entre dispositivos, respaldo remoto, panel municipal y revisión profesional contable y de protección de datos. No hay facturación electrónica, impuestos, conciliación bancaria, cuentas por pagar o devoluciones parciales. El costo de entradas se declara como pagado en efectivo o transferencia; no se ofrecen compras a crédito en la interfaz.

La app no puede inferir compras que no se registran, pérdidas desconocidas ni demanda durante agotamientos. Antes de un uso real, exportar el respaldo anterior, verificar saldos migrados y ejecutar el flujo con comerciantes. No fusionar/publicar automáticamente esta propuesta sobre la versión actual.
