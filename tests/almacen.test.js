import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  abrirBase,
  iniciar,
  leer,
  guardarOperacion,
  exportarRespaldo,
  restaurarBase,
  leerAntesRestaurar,
} from "../src/almacen.js";
import { crearEstado } from "../src/negocio.js";

const fecha = "2026-09-30T17:00:00.000Z";
const storage = { getItem: () => null };
async function base() {
  const db = await abrirBase(new IDBFactory(), "prueba");
  await iniciar(db, storage);
  return db;
}
const producto = {
  id: "leche",
  fecha,
  tipo: "producto",
  nombre: "Leche",
  unidad: "unidad",
  precioCents: 100,
  costoCents: 70,
  stockQ: 1000,
  minimoQ: 0,
};
const venta = (id) => ({
  id,
  fecha,
  tipo: "venta",
  lineas: [{ productoId: "leche", cantidadQ: 1000, precioCents: 100 }],
  metodo: "efectivo",
});

test("transacciones concurrentes no pueden vender dos veces la última unidad", async () => {
  const db = await base();
  await guardarOperacion(db, producto);
  const resultados = await Promise.allSettled([
    guardarOperacion(db, venta("v1")),
    guardarOperacion(db, venta("v2")),
  ]);
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
  const s = await leer(db);
  assert.equal(s.productos[0].stockQ, 0);
  assert.equal(s.ventas.length, 1);
  db.close();
});

test("error aborta completamente la operación de almacenamiento", async () => {
  const db = await base();
  await guardarOperacion(db, producto);
  const antes = await leer(db);
  await assert.rejects(
    guardarOperacion(db, {
      ...venta("v1"),
      lineas: [{ productoId: "leche", cantidadQ: 2000, precioCents: 100 }],
    }),
  );
  assert.deepEqual(await leer(db), antes);
  db.close();
});

test("reintentar el mismo ID no duplica stock, ventas o cobros", async () => {
  const db = await base();
  await guardarOperacion(db, producto);
  await guardarOperacion(db, venta("v1"));
  const antes = await leer(db);
  await guardarOperacion(db, venta("v1"));
  assert.deepEqual(await leer(db), antes);
  db.close();
});

test("restauración válida es completa y conserva la copia anterior", async () => {
  const db = await base();
  await guardarOperacion(db, producto);
  const antes = await leer(db);
  const nuevo = exportarRespaldo(crearEstado());
  await restaurarBase(db, nuevo);
  assert.deepEqual(await leer(db), nuevo.estado);
  assert.deepEqual(await leerAntesRestaurar(db), antes);
  db.close();
});

test("respaldo inválido no reemplaza el estado ni genera una copia parcial", async () => {
  const db = await base();
  await guardarOperacion(db, producto);
  const antes = await leer(db);
  assert.throws(() =>
    restaurarBase(db, { version: 3, fecha, estado: { version: 3 } }),
  );
  assert.deepEqual(await leer(db), antes);
  assert.equal(await leerAntesRestaurar(db), undefined);
  db.close();
});

test("JSON antiguo corrupto no se sobrescribe ni se inicializa como vacío", async () => {
  const db = await abrirBase(new IDBFactory(), "corrupto");
  const original = { getItem: (k) => (k === "fiados" ? "{corrupto" : null) };
  await assert.rejects(iniciar(db, original));
  assert.equal(original.getItem("fiados"), "{corrupto");
  await assert.rejects(leer(db));
  db.close();
});
