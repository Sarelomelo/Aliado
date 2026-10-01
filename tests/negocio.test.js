import test from "node:test";
import assert from "node:assert/strict";
import {
  aplicarOperacion,
  crearEstado,
  reporte,
  saldoDeuda,
  validarEstado,
  migrarLegado,
  cantidad,
  costoSalida,
} from "../src/negocio.js";
import { crearSimulacion } from "../src/simulacion.js";

const fecha = "2026-09-30T17:00:00.000Z";
let secuencia = 0;
const op = (tipo, datos = {}) => ({
  id: `op:${++secuencia}`,
  fecha,
  tipo,
  ...datos,
});
function tienda() {
  let s = aplicarOperacion(
    crearEstado(),
    op("tienda", {
      nombreTienda: "Tienda",
      nombreDueno: "Dueño",
      telefono: "",
    }),
  );
  s = aplicarOperacion(s, {
    ...op("producto", {
      nombre: "Leche",
      unidad: "unidad",
      precioCents: 100,
      costoCents: 70,
      stockQ: 10000,
      minimoQ: 3000,
    }),
    id: "leche",
  });
  s = aplicarOperacion(s, {
    ...op("cliente", { nombre: "Rosa", telefono: "" }),
    id: "rosa",
  });
  return s;
}
const vender = (s, cantidadQ, extra = {}) =>
  aplicarOperacion(
    s,
    op("venta", {
      lineas: [{ productoId: "leche", cantidadQ, precioCents: 100 }],
      metodo: "efectivo",
      ...extra,
    }),
  );

test("simulación completa cuadra ventas, stock, costo, deuda, merma y caja", () => {
  const { estado: s } = crearSimulacion(new Date(fecha));
  const r = reporte(s, "hoy", fecha);
  assert.equal(r.ventasCents, 675);
  assert.equal(r.costoCents, 460);
  assert.equal(r.margenCents, 215);
  assert.equal(r.mermaCents, 70);
  assert.equal(r.gastosCents, 50);
  assert.equal(r.resultadoCents, 95);
  assert.equal(r.pendientesCents, 200);
  assert.equal(s.productos.find((p) => p.id === "demo:leche").stockQ, 9000);
  assert.equal(s.productos.find((p) => p.id === "demo:leche").valorCents, 680);
  assert.equal(s.cierres.at(-1).esperadoCents, 1850);
  assert.equal(s.cierres.at(-1).diferenciaCents, 0);
});

test("carrito con varios productos descuenta todo y congela costos/precios", () => {
  let s = tienda();
  s = aplicarOperacion(s, {
    ...op("producto", {
      nombre: "Pan",
      unidad: "unidad",
      precioCents: 25,
      costoCents: 15,
      stockQ: 10000,
      minimoQ: 1000,
    }),
    id: "pan",
  });
  s = aplicarOperacion(
    s,
    op("venta", {
      lineas: [
        { productoId: "leche", cantidadQ: 2000, precioCents: 100 },
        { productoId: "pan", cantidadQ: 3000, precioCents: 25 },
      ],
      metodo: "efectivo",
    }),
  );
  assert.equal(s.ventas[0].totalCents, 275);
  assert.equal(s.productos[0].stockQ, 8000);
  assert.equal(s.productos[1].stockQ, 7000);
  s = aplicarOperacion(
    s,
    op("editarProducto", {
      productoId: "leche",
      nombre: "Leche nueva",
      precioCents: 200,
      minimoQ: 1000,
    }),
  );
  assert.equal(s.ventas[0].lineas[0].precioCents, 100);
  assert.equal(s.ventas[0].lineas[0].nombre, "Leche");
});

test("stock insuficiente en una línea no deja venta ni cambios parciales", () => {
  const s = tienda(),
    before = structuredClone(s);
  assert.throws(() => vender(s, 11000), /Stock insuficiente/);
  assert.deepEqual(s, before);
  assert.throws(
    () =>
      aplicarOperacion(
        s,
        op("venta", {
          lineas: [
            { productoId: "leche", cantidadQ: 1000, precioCents: 100 },
            { productoId: "leche", cantidadQ: 1000, precioCents: 100 },
          ],
          metodo: "efectivo",
        }),
      ),
    /Agrupa/,
  );
  assert.deepEqual(s, before);
});

test("operación repetida es idempotente", () => {
  const s = tienda(),
    venta = op("venta", {
      lineas: [{ productoId: "leche", cantidadQ: 1000, precioCents: 100 }],
      metodo: "efectivo",
    });
  const once = aplicarOperacion(s, venta),
    twice = aplicarOperacion(once, venta);
  assert.deepEqual(twice, once);
});

test("fiado y abono cuentan una sola venta y protegen saldo", () => {
  let s = vender(tienda(), 3000, {
    metodo: "fiado",
    clienteId: "rosa",
    abonoInicialCents: 100,
    metodoAbono: "transferencia",
  });
  const id = s.deudas[0].id;
  s = aplicarOperacion(
    s,
    op("abono", { deudaId: id, montoCents: 100, metodo: "efectivo" }),
  );
  assert.equal(reporte(s, "hoy", fecha).ventasCents, 300);
  assert.equal(reporte(s, "hoy", fecha).cobrosCents, 200);
  assert.equal(saldoDeuda(s.deudas[0]), 100);
  assert.throws(
    () =>
      aplicarOperacion(
        s,
        op("abono", { deudaId: id, montoCents: 101, metodo: "efectivo" }),
      ),
    /saldo/,
  );
  const abono = s.deudas[0].abonos.at(-1);
  s = aplicarOperacion(
    s,
    op("anularAbono", { deudaId: id, abonoId: abono.id, motivo: "Corrección" }),
  );
  assert.equal(saldoDeuda(s.deudas[0]), 200);
  assert.equal(reporte(s, "hoy", fecha).cobrosCents, 100);
});

test("anulación completa devuelve stock/costo y revierte todos los cobros del fiado", () => {
  let s = vender(tienda(), 3000, {
    metodo: "fiado",
    clienteId: "rosa",
    abonoInicialCents: 100,
    metodoAbono: "transferencia",
  });
  const id = s.ventas[0].id;
  s = aplicarOperacion(
    s,
    op("abono", { deudaId: id, montoCents: 100, metodo: "efectivo" }),
  );
  s = aplicarOperacion(
    s,
    op("anularVenta", {
      ventaId: id,
      motivo: "Compra anulada; devolución completa",
    }),
  );
  assert.equal(s.productos[0].stockQ, 10000);
  assert.equal(s.productos[0].valorCents, 700);
  assert.equal(saldoDeuda(s.deudas[0]), 0);
  assert.equal(reporte(s, "hoy", fecha).ventasCents, 0);
  assert.equal(reporte(s, "hoy", fecha).cobrosCents, 0);
  assert.throws(
    () =>
      aplicarOperacion(s, op("anularVenta", { ventaId: id, motivo: "Otra" })),
    /anulada/,
  );
});

test("devolución de otro día se informa en su fecha sin borrar el periodo anterior", () => {
  let s = vender(tienda(), 1000),
    id = s.ventas[0].id;
  s = aplicarOperacion(s, {
    ...op("anularVenta", { ventaId: id, motivo: "Devolución" }),
    fecha: "2026-10-01T17:00:00Z",
  });
  assert.equal(reporte(s, "hoy", fecha).ventasCents, 100);
  assert.equal(reporte(s, "hoy", "2026-10-01T17:00:00Z").ventasCents, -100);
});

test("reposiciones mantienen costo promedio y última salida consume todo el valor", () => {
  let s = tienda();
  s = aplicarOperacion(
    s,
    op("entrada", {
      productoId: "leche",
      cantidadQ: 10000,
      costoTotalCents: 900,
      metodo: "transferencia",
    }),
  );
  assert.equal(s.productos[0].valorCents, 1600);
  s = vender(s, 1000);
  assert.equal(s.ventas[0].costoCents, 80);
  s = vender(s, 19000);
  assert.equal(s.productos[0].stockQ, 0);
  assert.equal(s.productos[0].valorCents, 0);
});

test("merma descuenta inventario al costo, no precio de venta", () => {
  let s = aplicarOperacion(
    tienda(),
    op("merma", { productoId: "leche", cantidadQ: 2000, motivo: "Vencido" }),
  );
  assert.equal(s.productos[0].stockQ, 8000);
  assert.equal(reporte(s, "hoy", fecha).mermaCents, 140);
  assert.equal(reporte(s, "hoy", fecha).ventasCents, 0);
});

test("faltante de cierre se informa sin inventar ventas o modificar el saldo esperado", () => {
  let s = aplicarOperacion(tienda(), op("abrirCaja", { fondoCents: 2000 }));
  s = vender(s, 2000);
  s = aplicarOperacion(
    s,
    op("gasto", { montoCents: 50, concepto: "Fundas", metodo: "efectivo" }),
  );
  s = aplicarOperacion(
    s,
    op("retiro", { montoCents: 100, concepto: "Personal", metodo: "efectivo" }),
  );
  s = aplicarOperacion(s, op("cerrarCaja", { contadoCents: 2000 }));
  assert.equal(s.cierres[0].esperadoCents, 2050);
  assert.equal(s.cierres[0].diferenciaCents, -50);
  assert.equal(reporte(s, "hoy", fecha).ventasCents, 200);
});

test("cantidades por peso con redondeo a centavos y unidades enteras", () => {
  assert.equal(cantidad("0.125", "kg"), 125);
  assert.throws(() => cantidad("0.5", "unidad"));
  const p = { nombre: "Granel", stockQ: 3000, valorCents: 100 };
  assert.equal(costoSalida(p, 1000), 33);
});

test("clientes con el mismo nombre conservan identidades distintas", () => {
  let s = tienda();
  s = aplicarOperacion(
    s,
    op("cliente", { nombre: "Rosa", telefono: "0991234567" }),
  );
  assert.equal(s.clientes.length, 2);
  assert.notEqual(s.clientes[0].id, s.clientes[1].id);
});

test("migración preserva originales sin reconstruir ventas ni descontar mermas antiguas", () => {
  const datos = {
    version: 1,
    fecha,
    tienda: { nombreTienda: "Antigua", nombreDueno: "Dueño", telefono: "" },
    productos: [
      {
        id: 1,
        nombre: "Leche",
        fecha,
        precioCompra: 0.7,
        precioVenta: 1,
        stock: 10,
        stockMinimo: 2,
      },
    ],
    fiados: [
      { id: 1, nombre: "Rosa", telefono: "", fecha, monto: 3, abonos: [] },
      { id: 2, nombre: "Rosa", telefono: "", fecha, monto: 2, abonos: [] },
    ],
    mermas: [
      {
        id: 1,
        producto: "Leche",
        cantidad: 1,
        valor: 0.7,
        motivo: "vencido",
        fecha,
      },
    ],
    cierres: [],
  };
  const s = migrarLegado(datos);
  assert.deepEqual(s.legado, datos);
  assert.equal(s.productos[0].stockQ, 10000);
  assert.equal(s.ventas.length, 0);
  assert.equal(s.clientes.length, 2);
  assert.equal(
    s.deudas.reduce((sum, d) => sum + saldoDeuda(d), 0),
    500,
  );
  assert.equal(reporte(s, "hoy", fecha).mermaCents, 70);
});

test("respaldo con total de venta inconsistente o ID duplicado se rechaza", () => {
  const s = vender(tienda(), 1000);
  const malo = structuredClone(s);
  malo.ventas[0].totalCents = 999;
  assert.throws(() => validarEstado(malo), /inconsistente/);
  const duplicado = structuredClone(s);
  duplicado.productos.push({ ...duplicado.productos[0] });
  assert.throws(() => validarEstado(duplicado), /duplicado/);
});

test("anular una merma devuelve stock/costo y conserva el historial", () => {
  let s = aplicarOperacion(
    tienda(),
    op("merma", { productoId: "leche", cantidadQ: 2000, motivo: "Error" }),
  );
  const id = s.mermas[0].id;
  s = aplicarOperacion(
    s,
    op("anularMerma", { mermaId: id, motivo: "Producto recuperado" }),
  );
  assert.equal(s.productos[0].stockQ, 10000);
  assert.equal(s.productos[0].valorCents, 700);
  assert.equal(reporte(s, "hoy", fecha).mermaCents, 0);
  assert.equal(s.mermas.length, 2);
  assert.throws(() =>
    aplicarOperacion(s, op("anularMerma", { mermaId: id, motivo: "Otra vez" })),
  );
});

test("anular gasto corrige resultado y caja mediante un movimiento inverso", () => {
  let s = aplicarOperacion(
    tienda(),
    op("gasto", { montoCents: 50, concepto: "Fundas", metodo: "efectivo" }),
  );
  const id = s.movimientos.at(-1).id;
  s = aplicarOperacion(
    s,
    op("anularGasto", { movimientoId: id, motivo: "Pago reembolsado" }),
  );
  assert.equal(reporte(s, "hoy", fecha).gastosCents, 0);
  assert.equal(
    s.movimientos.reduce((sum, m) => sum + m.cashCents, 0),
    0,
  );
  assert.throws(() =>
    aplicarOperacion(
      s,
      op("anularGasto", { movimientoId: id, motivo: "Otra vez" }),
    ),
  );
});

test("corregir saldo previo conserva identidad y no permite reducir debajo de pagos", () => {
  let s = aplicarOperacion(tienda(), {
    ...op("deudaInicial", { clienteId: "rosa", montoCents: 500 }),
    id: "previa",
  });
  s = aplicarOperacion(
    s,
    op("abono", { deudaId: "previa", montoCents: 200, metodo: "efectivo" }),
  );
  assert.throws(() =>
    aplicarOperacion(
      s,
      op("corregirDeudaInicial", {
        deudaId: "previa",
        montoCents: 199,
        motivo: "Error",
      }),
    ),
  );
  s = aplicarOperacion(
    s,
    op("corregirDeudaInicial", {
      deudaId: "previa",
      montoCents: 400,
      motivo: "Cuaderno verificado",
    }),
  );
  assert.equal(saldoDeuda(s.deudas[0]), 200);
  assert.equal(s.deudas[0].ajustes[0].anteriorCents, 500);
});

test("reportes diarios, semanales, mensuales, anuales y fechas elegidas no mezclan periodos", () => {
  let s = vender(tienda(), 1000);
  s = aplicarOperacion(s, {
    ...op("venta", {
      lineas: [{ productoId: "leche", cantidadQ: 1000, precioCents: 100 }],
      metodo: "transferencia",
    }),
    fecha: "2026-10-01T17:00:00Z",
  });
  assert.equal(reporte(s, "mes", "2026-10-01T17:00:00Z").ventasCents, 100);
  assert.equal(reporte(s, "7dias", "2026-10-01T17:00:00Z").ventasCents, 200);
  assert.equal(reporte(s, "ano", "2026-10-01T17:00:00Z").ventasCents, 200);
  assert.equal(
    reporte(s, { inicio: "2026-09-01", fin: "2026-09-30" }).ventasCents,
    100,
  );
  assert.throws(() => reporte(s, { inicio: "2026-02-30", fin: "2026-03-01" }));
});

test("respaldo con stock o valor alterado sin movimiento se rechaza", () => {
  const s = tienda();
  for (const campo of ["stockQ", "valorCents"]) {
    const malo = structuredClone(s);
    malo.productos[0][campo] += 1000;
    assert.throws(() => validarEstado(malo), /historial/);
  }
});
