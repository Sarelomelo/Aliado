# Protocolo de aceptación: jornada de tienda

Estado: preparado para prueba manual. Las pruebas automatizadas de la implementación pasaron; la aceptación por el comerciante y la revisión contable siguen pendientes.

## Acceso
Vista previa: https://aliado-git-fix-integridad-datos-shorts-appweb.vercel.app
Vercel confirmó el despliegue del código 6c2ae410d42d70b96522a94fc9e4820b007898f6. La vista previa está protegida por inicio de sesión en Vercel; esa sesión pertenece al alojamiento, no es una cuenta de tendero de Aliado. No es necesario modificar la protección para probar con el propietario.

## Fase 1: verificar una jornada ya cargada
Pulsa «Probar tienda ficticia». No necesitas configurar una tienda real. Debe verse «Modo práctica · datos ficticios». La demostración ya trae la jornada completa; no repitas sus movimientos antes de comparar los resultados. Se puede reiniciar.

Secuencia precargada:
1. Inventario inicial: 10 leches a costo $0,70 y precio $1,00; 20 panes a costo $0,15 y precio $0,25; 10 kg de arroz a costo $1,00/kg y precio $1,50/kg. Fondo de caja $20,00.
2. Venta en efectivo de 2 leches y 4 panes: $3,00.
3. Venta fiada de 3 leches a Rosa: $3,00.
4. Abono de Rosa en efectivo: $1,00.
5. Merma de una leche por envase dañado: $0,70.
6. Reposición de 5 leches, costo total $4,00, pagada en efectivo.
7. Venta por transferencia de 0,5 kg de arroz: $0,75.
8. Gasto en efectivo de $0,50 y retiro personal de $1,00.
9. Cierre contado de $18,50.

| Comprobación | Esperado |
| --- | ---: |
| Ventas netas del día | $6,75 |
| Costo de productos vendidos | $4,60 |
| Margen bruto | $2,15 |
| Merma al costo | $0,70 |
| Gastos registrados | $0,50 |
| Resultado registrado después de merma y gastos | $0,95 |
| Fiado pendiente de Rosa | $2,00 |
| Leches / panes / arroz restantes | 9 unidades / 16 unidades / 9,5 kg |
| Valor del inventario de leche | $6,80 |
| Efectivo esperado y contado | $18,50 |
| Diferencia de cierre | $0,00 |

En Reportes usa «Hoy». El abono no debe aumentar ventas; la transferencia no debe aumentar efectivo. La reposición no es costo de venta hasta vender las unidades; el retiro personal no es gasto operativo. No sumar cantidades de unidades y kg como una misma medida.

## Fase 2: operar como tendero
Reinicia práctica antes de cada caso para tener la misma base.
- Vende una leche en efectivo por $1,00. Esperado: 8 leches, ventas del día $7,75 y efectivo acumulado $19,50. El cierre anterior conserva su fotografía; compara movimientos posteriores y realiza un nuevo cierre si deseas contarlo otra vez.
- Intenta vender 10 leches cuando solo hay 9. Debe bloquearse sin guardar venta ni reducir inventario.
- Intenta cobrar $2,01 del fiado pendiente de $2,00. Debe bloquearse sin modificar deuda ni caja.
- Abona $1,00 a Rosa. Debe quedar $1,00 pendiente y aumentar efectivo a $19,50, con ventas todavía $6,75.
- Anula una venta registrada y compara stock, deuda, pagos y reportes. Debe conservarse el registro original y su reversión. Una devolución parcial aún no está disponible.
- Cambia el precio de un producto y comprueba que el importe histórico de la venta siga igual.
- Navega durante una venta sin confirmar. El carrito debe conservarse al cambiar de sección. No se garantiza conservarlo al recargar.
- Sal de práctica. Sus operaciones no deben aparecer en tu tienda real. Al recargar, la práctica se descarta.

## Fase 3: persistencia en una tienda ficticia de prueba
La práctica solo está en memoria. Para comprobar recarga, respaldos y uso sin conexión usa un navegador/perfil de prueba y una tienda de datos ficticios fuera del modo práctica.
- Registra una venta, recarga y verifica stock e historial.
- Exporta respaldo, anota totales y restaura en otro perfil de prueba; compara resultados.
- Tras cargar la app con conexión y dejar instalar su caché, desconecta y prueba una venta; reconecta y recarga para revisar persistencia. La protección de Vercel puede impedir el acceso inicial sin conexión.
- Prueba dos pestañas con operaciones consecutivas y verifica el saldo compartido después de actualizar.
- Prueba un respaldo inconsistente: debe rechazarse conservando los datos anteriores.
No uses «borrar datos del sitio» con información real sin respaldo. Los datos se guardan por navegador y origen; no se sincronizan entre dispositivos ni se envían al municipio.

## Registro de incidencias y salida de esta etapa
Por cada problema anota dispositivo/navegador, sección, pasos, resultado esperado, resultado observado y si persiste al repetir. Usa información ficticia en capturas.

Criterio para avanzar: resultados monetarios e inventario coincidentes; ningún caso manual con pérdida de datos; incidencias de cálculo resueltas; evaluación de facilidad de uso por un comerciante; revisión de reglas de costos, caja y fiados por alguien con experiencia contable. No se afirma ausencia total de errores.

Después: diseñar cuentas por tienda, sincronización y respaldo en servidor, permisos de acceso, indicadores municipales y alcance de datos compartidos. El panel municipal debe distinguir datos registrados de estimaciones y cobertura del registro.
