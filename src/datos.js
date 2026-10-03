// Persistimos dólares por compatibilidad; toda suma/comparación monetaria usa centavos.
const FORMATO_DIA_EC = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Guayaquil",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const CLAVES = ["tienda", "fiados", "mermas", "cierres", "productos"];

export function centavos(valor) {
  if (typeof valor === "string" && !/^\d+(?:\.\d{1,2})?$/.test(valor.trim())) {
    throw new Error(
      "Introduce un importe no negativo con hasta dos decimales.",
    );
  }
  if (!["string", "number"].includes(typeof valor))
    throw new Error("Importe inválido.");
  const numero = Number(valor);
  const resultado = Math.round(numero * 100);
  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    !Number.isSafeInteger(resultado) ||
    resultado > 99999999999 ||
    Math.abs(numero * 100 - resultado) > 0.00001
  ) {
    throw new Error(
      "Importe inválido: usa hasta dos decimales y un valor no negativo.",
    );
  }
  return resultado;
}

export function importe(valor, opcional = false) {
  return centavos(opcional && valor === "" ? 0 : valor) / 100;
}

export function unidades(valor, opcional = false) {
  if (opcional && valor === "") return 0;
  if (
    !["string", "number"].includes(typeof valor) ||
    !/^\d+$/.test(String(valor))
  ) {
    throw new Error("La cantidad debe ser un número entero no negativo.");
  }
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero > 1000000000)
    throw new Error("Cantidad fuera de rango.");
  return numero;
}

export function sumarImportes(valores) {
  const total = valores.reduce((s, v) => s + centavos(v), 0);
  if (!Number.isSafeInteger(total)) throw new Error("Total fuera de rango.");
  return total / 100;
}

export function deuda(fiado) {
  return (
    (centavos(fiado.monto) -
      fiado.abonos.reduce((s, a) => s + centavos(a.monto), 0)) /
    100
  );
}

export function validarFiado(fiado) {
  const monto = centavos(fiado.monto);
  if (monto <= 0 || !Array.isArray(fiado.abonos))
    throw new Error("Fiado inválido.");
  let pagado = 0;
  for (const a of fiado.abonos) {
    const abono = centavos(a.monto);
    if (abono <= 0) throw new Error("El abono debe ser mayor que cero.");
    pagado += abono;
  }
  if (pagado > monto)
    throw new Error("Los abonos no pueden superar el monto fiado.");
  return fiado;
}

export function diaEcuador(fecha = new Date()) {
  const d = new Date(fecha);
  if (!Number.isFinite(d.getTime())) throw new Error("Fecha inválida.");
  const parts = FORMATO_DIA_EC.formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function mermasDelMes(mermas, hoy = new Date()) {
  const mes = diaEcuador(hoy).slice(0, 7);
  return mermas.filter((m) => diaEcuador(m.fecha).slice(0, 7) === mes);
}

export function estimarCierre({
  efectivoFinal,
  efectivoInicial,
  retiro,
  fiadoDadoHoy,
  fiadoCobradoHoy,
}) {
  const ventasEfectivo =
    (centavos(efectivoFinal) - centavos(efectivoInicial) + centavos(retiro)) /
    100;
  const ventasTotales =
    (Math.round(ventasEfectivo * 100) +
      centavos(fiadoDadoHoy) -
      centavos(fiadoCobradoHoy)) /
    100;
  return {
    ventasEfectivo,
    ventasTotales,
    gananciaEstimada: null,
    fiadoDadoHoy,
    fiadoCobradoHoy,
  };
}

function texto(v, obligatorio = true) {
  if (typeof v !== "string" || (obligatorio && !v.trim()))
    throw new Error("Texto obligatorio inválido.");
}
function fecha(v) {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(v) ||
    !Number.isFinite(Date.parse(v))
  ) {
    throw new Error("Fecha de registro inválida.");
  }
}
function id(v) {
  if (
    !(typeof v === "string" && v.trim()) &&
    !(Number.isSafeInteger(v) && v > 0)
  )
    throw new Error("ID inválido.");
}

export function validarDatos(clave, datos) {
  if (clave === "tienda") {
    if (datos === null) return datos;
    if (!datos || typeof datos !== "object")
      throw new Error("Tienda inválida.");
    texto(datos.nombreTienda);
    texto(datos.nombreDueno);
    texto(datos.telefono, false);
    return datos;
  }
  if (!Array.isArray(datos))
    throw new Error(`La colección ${clave} debe ser una lista.`);
  const ids = new Set();
  for (const r of datos) {
    if (!r || typeof r !== "object") throw new Error("Registro inválido.");
    id(r.id);
    fecha(r.fecha);
    if (ids.has(String(r.id))) throw new Error(`ID duplicado en ${clave}.`);
    ids.add(String(r.id));
    if (clave === "fiados") {
      texto(r.nombre);
      texto(r.telefono, false);
      validarFiado(r);
      r.abonos.forEach((a) => fecha(a.fecha));
      if (r.recordatorios !== undefined) {
        if (!Array.isArray(r.recordatorios))
          throw new Error("Recordatorios inválidos.");
        r.recordatorios.forEach((a) => fecha(a.fecha));
      }
    } else if (clave === "mermas") {
      texto(r.producto);
      texto(r.motivo);
      if (unidades(r.cantidad) <= 0)
        throw new Error("La merma debe tener cantidad positiva.");
      centavos(r.valor);
    } else if (clave === "productos") {
      texto(r.nombre);
      centavos(r.precioCompra);
      centavos(r.precioVenta);
      unidades(r.stock);
      unidades(r.stockMinimo);
    } else if (clave === "cierres") {
      for (const k of [
        "efectivoFinal",
        "efectivoInicial",
        "retiro",
        "fiadoDadoHoy",
        "fiadoCobradoHoy",
      ])
        centavos(r[k]);
      // Cierres históricos pueden contener cifras negativas del cálculo anterior.
      for (const k of ["ventasEfectivo", "ventasTotales", "gananciaEstimada"]) {
        if (k === "gananciaEstimada" && r[k] === null) continue;
        if (typeof r[k] !== "number" || !Number.isFinite(r[k]))
          throw new Error("Cierre inválido.");
      }
    } else throw new Error("Colección desconocida.");
  }
  return datos;
}

export function validarRespaldo(datos) {
  if (!datos || ![1, 2].includes(datos.version))
    throw new Error("Versión de respaldo no compatible.");
  fecha(datos.fecha);
  for (const clave of CLAVES) {
    if (!Object.hasOwn(datos, clave))
      throw new Error(`Falta ${clave} en el respaldo.`);
    validarDatos(clave, datos[clave]);
  }
  return datos;
}

export function restaurarDatos(storage, datos) {
  validarRespaldo(datos); // Validar todo antes de modificar el almacenamiento.
  const anteriores = Object.fromEntries(
    CLAVES.map((k) => [k, storage.getItem(k)]),
  );
  const escritos = [];
  try {
    for (const k of CLAVES) {
      storage.setItem(k, JSON.stringify(datos[k]));
      escritos.push(k);
    }
  } catch {
    let recuperado = true;
    for (const k of escritos.reverse()) {
      try {
        if (anteriores[k] === null) storage.removeItem(k);
        else storage.setItem(k, anteriores[k]);
      } catch {
        recuperado = false;
      }
    }
    throw new Error(
      recuperado
        ? "No se pudo guardar el respaldo. Se conservaron los datos anteriores."
        : "Falló la restauración y su recuperación. Conserva ambos respaldos y solicita soporte.",
    );
  }
}
