import { CLAVES } from "./datos.js";
import {
  aplicarOperacion,
  crearEstado,
  migrarLegado,
  validarEstado,
} from "./negocio.js";

export function abrirBase(factory = indexedDB, nombre = "aliado-negocio-v3") {
  return new Promise((resolve, reject) => {
    const req = factory.open(nombre, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("documentos");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(
          "No se pudo abrir el almacenamiento. Conserva tus respaldos.",
        ),
      );
    req.onblocked = () =>
      reject(new Error("Cierra otras pestañas de Aliado para continuar."));
  });
}
function ejecutar(db, modo, trabajo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("documentos", modo);
    const store = tx.objectStore("documentos");
    let resultado, error;
    const req = store.get("principal");
    req.onsuccess = () => {
      try {
        resultado = trabajo(req.result, store);
      } catch (e) {
        error = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => {
      error ||= tx.error;
    };
    tx.onabort = () =>
      reject(
        error ||
          new Error(
            "No se guardó la operación. El almacenamiento puede estar lleno.",
          ),
      );
  });
}
export function iniciar(db, storage = localStorage) {
  return ejecutar(db, "readwrite", (actual, store) => {
    if (actual) return validarEstado(actual);
    const valores = Object.fromEntries(
      CLAVES.map((k) => [k, storage.getItem(k)]),
    );
    const tieneDatos = Object.values(valores).some((v) => v !== null);
    const inicial = tieneDatos
      ? migrarLegado({
          version: 2,
          fecha: new Date().toISOString(),
          ...Object.fromEntries(
            CLAVES.map((k) => [
              k,
              valores[k] === null
                ? k === "tienda"
                  ? null
                  : []
                : JSON.parse(valores[k]),
            ]),
          ),
        })
      : crearEstado();
    store.put(inicial, "principal");
    return inicial;
  });
}
export function leer(db) {
  return ejecutar(db, "readonly", (s) => validarEstado(s));
}
export function guardarOperacion(db, op) {
  return ejecutar(db, "readwrite", (s, store) => {
    const nuevo = aplicarOperacion(validarEstado(s), op);
    store.put(nuevo, "principal");
    return nuevo;
  });
}
export function exportarRespaldo(estado) {
  validarEstado(estado);
  return { version: 3, fecha: new Date().toISOString(), estado };
}
export function prepararRespaldo(datos) {
  if ([1, 2].includes(datos?.version)) return migrarLegado(datos);
  if (
    datos?.version !== 3 ||
    typeof datos.fecha !== "string" ||
    !Number.isFinite(Date.parse(datos.fecha))
  )
    throw new Error("Respaldo no compatible.");
  return validarEstado(datos.estado);
}
export function restaurarBase(db, datos) {
  const validado = prepararRespaldo(datos);
  return ejecutar(db, "readwrite", (actual, store) => {
    if (actual !== undefined) store.put(actual, "antesRestaurar");
    store.put(validado, "principal");
    return validado;
  });
}
export function leerAntesRestaurar(db) {
  return new Promise((resolve, reject) => {
    const req = db
      .transaction("documentos")
      .objectStore("documentos")
      .get("antesRestaurar");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function leerOriginales(db) {
  return ejecutar(db, "readonly", (s) => s);
}
