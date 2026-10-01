import test from "node:test";
import assert from "node:assert/strict";
import { calcularCompra } from "../src/compras.js";
import { crearEstado, aplicarOperacion } from "../src/negocio.js";

test("dos sacos de 50 kg: ventas fraccionadas y merma descuentan peso", () => {
  const c = calcularCompra({
    unidad: "kg",
    envases: "2",
    contenido: "50",
    total: "80",
  });
  assert.deepEqual(c, { stockQ: 100000, valorCents: 8000, costoCents: 80 });
  const fecha = new Date().toISOString();
  let s = aplicarOperacion(crearEstado(), {
    id: "arroz",
    tipo: "producto",
    fecha,
    nombre: "Arroz",
    unidad: "kg",
    precioCents: 100,
    costoCents: c.costoCents,
    stockQ: c.stockQ,
    valorInicialCents: c.valorCents,
    minimoQ: 5000,
  });
  s = aplicarOperacion(s, {
    id: "v",
    tipo: "venta",
    fecha,
    metodo: "efectivo",
    lineas: [{ productoId: "arroz", cantidadQ: 1500, precioCents: 100 }],
  });
  assert.equal(s.productos[0].stockQ, 98500);
  assert.equal(s.productos[0].valorCents, 7880);
  s = aplicarOperacion(s, {
    id: "m",
    tipo: "merma",
    fecha,
    productoId: "arroz",
    cantidadQ: 500,
    motivo: "Dañado",
  });
  assert.equal(s.productos[0].stockQ, 98000);
});

test("el costo total inicial se conserva cuando no divide a centavos exactos", () => {
  const c = calcularCompra({
    unidad: "unidad",
    envases: "1",
    contenido: "3",
    total: "1",
  });
  const fecha = new Date().toISOString();
  let s = aplicarOperacion(crearEstado(), {
    id: "p",
    tipo: "producto",
    fecha,
    nombre: "Paquete",
    unidad: "unidad",
    precioCents: 50,
    costoCents: c.costoCents,
    stockQ: c.stockQ,
    valorInicialCents: c.valorCents,
    minimoQ: 0,
  });
  assert.equal(s.productos[0].valorCents, 100);
  s = aplicarOperacion(s, {
    id: "v",
    tipo: "venta",
    fecha,
    metodo: "efectivo",
    lineas: [{ productoId: "p", cantidadQ: 3000, precioCents: 50 }],
  });
  assert.equal(s.ventas[0].costoCents, 100);
  assert.equal(s.productos[0].valorCents, 0);
});

test("conversión admite cajas y litros y rechaza cantidades inconsistentes", () => {
  assert.equal(
    calcularCompra({
      unidad: "unidad",
      envases: "2",
      contenido: "12",
      total: "16",
    }).stockQ,
    24000,
  );
  assert.equal(
    calcularCompra({
      unidad: "litro",
      envases: "3",
      contenido: "2.5",
      total: "15",
    }).stockQ,
    7500,
  );
  for (const cambio of [
    { envases: "0" },
    { envases: "1.5" },
    { contenido: "0" },
    { total: "-1" },
    { unidad: "otro" },
    { envases: "99999999", contenido: "99999999" },
  ]) {
    assert.throws(() =>
      calcularCompra({
        unidad: "kg",
        envases: "2",
        contenido: "50",
        total: "80",
        ...cambio,
      }),
    );
  }
  assert.throws(() =>
    calcularCompra({
      unidad: "unidad",
      envases: "1",
      contenido: "2.5",
      total: "1",
    }),
  );
});
