# Aliado

Aplicación web/PWA de gestión sencilla para pequeños comercios: fiados, abonos, mermas, productos y cierres estimados de caja.

## Ejecución

Node.js 20.19+ o 22.12+ compatible con Vite 8. Instalar dependencias desde el archivo de bloqueo; no copiar node_modules entre sistemas operativos.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

## Correcciones de integridad

- Sumas y comparaciones de fiados/abonos/mermas/cierres en centavos; se mantiene almacenamiento en dólares para compatibilidad.
- Importes no negativos de hasta dos decimales; existencias y cantidades enteras.
- No se admiten abonos superiores al fiado, ni reducir un fiado por debajo de lo ya abonado.
- Merma mensual y fechas operativas según America/Guayaquil.
- Validación de respaldos completos antes de escribir. Intento de reversión si falla una escritura; localStorage no ofrece transacciones ni garantía ante interrupciones del proceso.
- Datos inválidos al cargar activan una pantalla de recuperación con exportación de originales; nunca se sustituyen silenciosamente por listas vacías.
- Respaldos nuevos versión 2; se aceptan respaldos válidos versión 1. No importar respaldos versión 2 en versiones antiguas de la aplicación.
- Se elimina la inferencia de identidad por nombre y las etiquetas de buen/mal pagador. El historial de cada fiado y sus abonos se conserva.
- Un clic de WhatsApp se describe como intento de apertura, sin confirmar envío.
- Se retira la ganancia del 25%: no hay datos suficientes para calcular rentabilidad. Los cierres históricos mantienen sus campos originales en el almacenamiento, pero no se presentan como utilidad.

## Límites actuales

Los registros siguen en localStorage, por navegador y dominio. No hay cuentas, backend, sincronización, panel municipal ni autenticación. No usar esta versión como contabilidad oficial o fuente de rentabilidad del cantón.

Inventario y merma/fiados todavía no están integrados. Reposición cambia el costo de compra de todo el stock; no hay costeo por lotes, promedio ponderado ni libro de movimientos. Los cierres estiman ventas bajo supuestos de caja: faltan gastos, compras, aportes, pagos electrónicos y ventas por producto. Si cambian fiados o abonos, el cierre guardado debe actualizarse manualmente. Ediciones/eliminaciones no tienen auditoría y varias pestañas pueden competir al escribir.

La siguiente fase debe definir movimientos trazables, identidad de clientes, ventas/costos/gastos, validación de reglas contables y luego cuentas/permisos, respaldo central y sincronización. Los informes municipales requieren cobertura y calidad medibles, con acceso autorizado y protección de datos.

## Verificación

Pruebas unitarias de reglas monetarias, mes en Ecuador, integridad de respaldos, duplicados y reversión ante fallos de almacenamiento. Compilación de producción y revisión estática. La validación interactiva en dispositivos y del funcionamiento sin conexión sigue pendiente.
