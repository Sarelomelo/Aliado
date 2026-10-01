import { CLAVES } from "./datos.js";
import {
  aplicarOperacion,
  crearEstado,
  migrarLegado,
  validarEstado,
} from "./negocio.js";

export function abrirBase(
  factory = indexedDB,
  nombre = "aliado-negocio-v3",
  limiteMs = 8000,
) {
  return new Promise((resolve, reject) => {
    let terminado = false;
    const terminar = (error, db) => {
      if (terminado) {
        db?.close();
        return;
      }
      terminado = true;
      clearTimeout(reloj);
      if (error) reject(error);
      else resolve(db);
    };
    const reloj = setTimeout(
      () =>
        terminar(
          new Error(
            "Tu navegador está tardando en abrir los datos. Cierra otras pestañas de Aliado e intenta de nuevo. No borres los datos del sitio.",
          ),
        ),
      limiteMs,
    );
    let req;
    try {
      req = factory.open(nombre, 1);
    } catch (error) {
      terminar(error);
      return;
    }
    req.onupgradeneeded = () => {
      if (terminado) {
        req.transaction.abort();
        return;
      }
      req.result.createObjectStore("documentos");
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      terminar(null, req.result);
    };
    req.onerror = () =>
      terminar(
        new Error(
          "No se pudo abrir el almacenamiento. Conserva tus respaldos.",
        ),
      );
    req.onblocked = () =>
      terminar(new Error("Cierra otras pestañas de Aliado para continuar."));
  });
}
function ejecutar(db, modo, trabajo, limiteMs = 15000) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("documentos", modo);
    const reloj = setTimeout(() => {
      error = new Error(
        "El navegador tardó demasiado en acceder a los datos. La operación se canceló; intenta de nuevo sin borrar los datos del sitio.",
      );
      try {
        tx.abort();
        reject(error);
      } catch {
        reject(
          new Error(
            "No pudimos confirmar el resultado. Vuelve a abrir Aliado y revisa el historial antes de repetir la operación.",
          ),
        );
      }
    }, limiteMs);
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
    tx.oncomplete = () => {
      clearTimeout(reloj);
      resolve(resultado);
    };
    tx.onerror = () => {
      error ||= tx.error;
    };
    tx.onabort = () => {
      clearTimeout(reloj);
      reject(
        error ||
          new Error(
            "No se guardó la operación. El almacenamiento puede estar lleno.",
          ),
      );
    };
  });
}
export async function iniciar(db, storage = localStorage) {
  // En una recarga normal solo leemos: no pedimos un bloqueo de escritura.
  const existente = await ejecutar(db, "readonly", (s) =>
    s === undefined ? undefined : validarEstado(s),
  );
  if (existente !== undefined) return existente;
  return ejecutar(db, "readwrite", (actual, store) => {
    if (actual !== undefined) return validarEstado(actual);
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
export function leer(db, limiteMs = 15000) {
  return ejecutar(db, "readonly", (s) => validarEstado(s), limiteMs);
}
export function guardarOperacion(db, op, limiteMs = 15000) {
  return ejecutar(
    db,
    "readwrite",
    (s, store) => {
      const nuevo = aplicarOperacion(validarEstado(s), op);
      store.put(nuevo, "principal");
      return nuevo;
    },
    limiteMs,
  );
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
