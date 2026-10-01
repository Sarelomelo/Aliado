import { centavos, diaEcuador, validarRespaldo } from "./datos.js";

const copia = (x) => structuredClone(x);
const exigir = (ok, mensaje) => {
  if (!ok) throw new Error(mensaje);
};
const texto = (v, nombre = "Nombre") => {
  exigir(typeof v === "string" && v.trim(), `${nombre} obligatorio.`);
  return v.trim();
};
const entero = (v, nombre = "Valor") => {
  exigir(
    Number.isSafeInteger(v) && v >= 0 && v <= 99999999999,
    `${nombre} inválido.`,
  );
  return v;
};
const sumar = (xs) =>
  xs.reduce((s, x) => {
    exigir(Number.isSafeInteger(s + x), "Total fuera de rango.");
    return s + x;
  }, 0);
export const dinero = (v) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    v / 100,
  );
export const cantidadTexto = (q) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 3 }).format(q / 1000);

export function cantidad(v, unidad = "unidad") {
  exigir(
    typeof v === "string" && /^\d+(?:\.\d{1,3})?$/.test(v.trim()),
    "Introduce una cantidad válida (hasta 3 decimales).",
  );
  const q = Math.round(Number(v) * 1000);
  entero(q, "Cantidad");
  exigir(
    unidad !== "unidad" || q % 1000 === 0,
    "Los productos por unidad necesitan cantidades enteras.",
  );
  return q;
}
export function importeCantidad(precioCents, q) {
  entero(precioCents, "Precio");
  entero(q, "Cantidad");
  exigir(Number.isSafeInteger(precioCents * q), "Importe fuera de rango.");
  return Math.round((precioCents * q) / 1000);
}
export function crearEstado() {
  return {
    version: 3,
    revision: 0,
    tienda: null,
    productos: [],
    clientes: [],
    deudas: [],
    ventas: [],
    mermas: [],
    movimientos: [],
    cierres: [],
    auditoria: [],
    legado: null,
  };
}
export function saldoDeuda(d) {
  return d.anuladaPor
    ? 0
    : d.montoCents -
        sumar(d.abonos.filter((a) => !a.anuladaPor).map((a) => a.montoCents));
}
export function costoSalida(p, q) {
  exigir(q > 0 && q <= p.stockQ, `Stock insuficiente de ${p.nombre}.`);
  return q === p.stockQ
    ? p.valorCents
    : Math.round((p.valorCents * q) / p.stockQ);
}
function producto(s, id) {
  const p = s.productos.find((p) => p.id === id);
  exigir(p && p.activo, "Producto no disponible.");
  return p;
}
function registrarMovimiento(
  s,
  op,
  tipo,
  cashCents = 0,
  transferCents = 0,
  extra = {},
) {
  exigir(
    Number.isSafeInteger(cashCents) && Number.isSafeInteger(transferCents),
    "Movimiento fuera de rango.",
  );
  s.movimientos.push({
    id: op.id,
    fecha: op.fecha,
    tipo,
    cashCents,
    transferCents,
    ...extra,
  });
}
function pago(op, total) {
  exigir(
    ["efectivo", "transferencia", "pendiente"].includes(op.metodo),
    "Selecciona cómo se pagó.",
  );
  return {
    cash: op.metodo === "efectivo" ? total : 0,
    transfer: op.metodo === "transferencia" ? total : 0,
  };
}

export function aplicarOperacion(estado, op) {
  exigir(
    op && typeof op.id === "string" && op.id.length > 0,
    "Operación sin identificador.",
  );
  exigir(
    typeof op.fecha === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(op.fecha) &&
      Number.isFinite(Date.parse(op.fecha)),
    "Fecha inválida.",
  );
  // La misma operación, reenviada, devuelve el resultado previo sin repetir efectos.
  if (estado.auditoria.some((a) => a.id === op.id)) return estado;
  const s = copia(estado);
  const dia = diaEcuador(op.fecha);
  if (op.tipo === "tienda") {
    s.tienda = {
      nombreTienda: texto(op.nombreTienda),
      nombreDueno: texto(op.nombreDueno),
      telefono: String(op.telefono || "").trim(),
    };
  } else if (op.tipo === "producto") {
    exigir(["unidad", "kg", "litro"].includes(op.unidad), "Unidad inválida.");
    const q = entero(op.stockQ, "Stock");
    const precio = entero(op.precioCents, "Precio");
    const costo = entero(op.costoCents, "Costo");
    const valorInicial =
      op.valorInicialCents === undefined
        ? importeCantidad(costo, q)
        : entero(op.valorInicialCents, "Valor inicial");
    exigir(
      q > 0 || valorInicial === 0,
      "Para registrar el costo de una compra, indica también la cantidad.",
    );
    exigir(
      op.unidad !== "unidad" || q % 1000 === 0,
      "Stock por unidad debe ser entero.",
    );
    s.productos.push({
      id: op.id,
      nombre: texto(op.nombre),
      unidad: op.unidad,
      precioCents: precio,
      costoReferenciaCents: costo,
      stockQ: q,
      minimoQ: entero(op.minimoQ, "Mínimo"),
      valorCents: valorInicial,
      activo: true,
    });
    registrarMovimiento(s, op, "inventarioInicial", 0, 0, {
      productoId: op.id,
      deltaQ: q,
      costoCents: valorInicial,
    });
  } else if (op.tipo === "editarProducto") {
    const p = producto(s, op.productoId);
    p.nombre = texto(op.nombre);
    p.precioCents = entero(op.precioCents, "Precio");
    p.minimoQ = entero(op.minimoQ, "Mínimo");
    exigir(
      p.unidad !== "unidad" || p.minimoQ % 1000 === 0,
      "El mínimo debe ser entero.",
    );
    // Existencias y costo nunca se alteran mediante edición de catálogo.
  } else if (op.tipo === "archivarProducto") {
    const p = producto(s, op.productoId);
    exigir(p.stockQ === 0, "Solo puedes archivar productos sin existencias.");
    p.activo = false;
  } else if (op.tipo === "cliente") {
    s.clientes.push({
      id: op.id,
      nombre: texto(op.nombre),
      telefono: String(op.telefono || "").trim(),
    });
  } else if (op.tipo === "editarCliente") {
    const c = s.clientes.find((c) => c.id === op.clienteId);
    exigir(c, "Cliente no encontrado.");
    c.nombre = texto(op.nombre);
    c.telefono = String(op.telefono || "").trim();
  } else if (op.tipo === "corregirDeudaInicial") {
    const d = s.deudas.find((d) => d.id === op.deudaId);
    exigir(
      d && !d.ventaId,
      "Solo puedes corregir saldos previos sin venta vinculada.",
    );
    texto(op.motivo, "Motivo");
    const nuevo = entero(op.montoCents, "Monto total corregido");
    exigir(
      nuevo >=
        sumar(d.abonos.filter((a) => !a.anuladaPor).map((a) => a.montoCents)),
      "El monto corregido no puede ser inferior a los abonos vigentes.",
    );
    d.ajustes ||= [];
    d.ajustes.push({
      id: op.id,
      fecha: op.fecha,
      anteriorCents: d.montoCents,
      nuevoCents: nuevo,
      motivo: op.motivo,
    });
    d.montoCents = nuevo;
  } else if (op.tipo === "deudaInicial") {
    exigir(
      s.clientes.some((c) => c.id === op.clienteId),
      "Selecciona un cliente.",
    );
    const monto = entero(op.montoCents, "Saldo");
    exigir(monto > 0, "El saldo debe ser positivo.");
    s.deudas.push({
      id: op.id,
      clienteId: op.clienteId,
      fecha: op.fecha,
      montoCents: monto,
      abonos: [],
      origen: "saldo previo",
      ventaId: null,
    });
  } else if (op.tipo === "entrada") {
    const p = producto(s, op.productoId);
    const q = entero(op.cantidadQ, "Cantidad");
    exigir(q > 0, "La entrada debe ser positiva.");
    exigir(
      p.unidad !== "unidad" || q % 1000 === 0,
      "Cantidad por unidad debe ser entera.",
    );
    const costo = entero(op.costoTotalCents, "Costo total");
    const pay = pago(op, costo);
    p.stockQ = entero(p.stockQ + q, "Stock");
    p.valorCents = entero(p.valorCents + costo, "Valor de inventario");
    p.costoReferenciaCents = Math.round((costo * 1000) / q);
    registrarMovimiento(s, op, "entrada", -pay.cash, -pay.transfer, {
      productoId: p.id,
      deltaQ: q,
      costoCents: costo,
      metodo: op.metodo,
    });
  } else if (op.tipo === "venta") {
    exigir(
      Array.isArray(op.lineas) && op.lineas.length > 0,
      "Añade productos al carrito.",
    );
    exigir(
      ["efectivo", "transferencia", "fiado"].includes(op.metodo),
      "Forma de pago inválida.",
    );
    const ids = new Set();
    const lineas = op.lineas.map((l) => {
      exigir(!ids.has(l.productoId), "Agrupa las cantidades de cada producto.");
      ids.add(l.productoId);
      const p = producto(s, l.productoId);
      const q = entero(l.cantidadQ, "Cantidad");
      exigir(
        p.unidad !== "unidad" || q % 1000 === 0,
        "Cantidad por unidad debe ser entera.",
      );
      // Precio explícito del carrito: no se cambia si el catálogo cambia en otra pestaña.
      const precio = entero(l.precioCents, "Precio de venta");
      const total = importeCantidad(precio, q);
      exigir(total > 0, "Cada línea debe tener un importe positivo.");
      const costo = costoSalida(p, q);
      p.stockQ -= q;
      p.valorCents -= costo;
      return {
        productoId: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        cantidadQ: q,
        precioCents: precio,
        totalCents: total,
        costoCents: costo,
      };
    });
    const total = sumar(lineas.map((l) => l.totalCents));
    const costo = sumar(lineas.map((l) => l.costoCents));
    let cobrado = total;
    if (op.metodo === "fiado") {
      exigir(
        s.clientes.some((c) => c.id === op.clienteId),
        "Selecciona el cliente del fiado.",
      );
      cobrado = entero(op.abonoInicialCents || 0, "Abono inicial");
      exigir(
        cobrado < total,
        "El abono inicial debe ser menor que la venta; para pago completo elige efectivo o transferencia.",
      );
      exigir(
        ["efectivo", "transferencia"].includes(op.metodoAbono || "efectivo"),
        "Forma de abono inválida.",
      );
      s.deudas.push({
        id: op.id,
        clienteId: op.clienteId,
        fecha: op.fecha,
        montoCents: total,
        abonos: cobrado
          ? [
              {
                id: `${op.id}:inicial`,
                fecha: op.fecha,
                montoCents: cobrado,
                metodo: op.metodoAbono || "efectivo",
                inicial: true,
              },
            ]
          : [],
        ventaId: op.id,
        origen: "venta",
      });
    }
    const metodoCobro =
      op.metodo === "fiado" ? op.metodoAbono || "efectivo" : op.metodo;
    const v = {
      id: op.id,
      fecha: op.fecha,
      tipo: "venta",
      lineas,
      totalCents: total,
      costoCents: costo,
      metodo: op.metodo,
      clienteId: op.clienteId || null,
    };
    s.ventas.push(v);
    registrarMovimiento(
      s,
      op,
      "venta",
      metodoCobro === "efectivo" ? cobrado : 0,
      metodoCobro === "transferencia" ? cobrado : 0,
      {
        ventaId: op.id,
        salidas: lineas.map((l) => ({
          productoId: l.productoId,
          deltaQ: -l.cantidadQ,
          costoCents: -l.costoCents,
        })),
      },
    );
  } else if (op.tipo === "abono") {
    const d = s.deudas.find((d) => d.id === op.deudaId);
    exigir(d && !d.anuladaPor, "Deuda no disponible.");
    const monto = entero(op.montoCents, "Abono");
    exigir(
      monto > 0 && monto <= saldoDeuda(d),
      "El abono debe ser positivo y no superar el saldo.",
    );
    exigir(
      ["efectivo", "transferencia"].includes(op.metodo),
      "Selecciona el medio de cobro.",
    );
    d.abonos.push({
      id: op.id,
      fecha: op.fecha,
      montoCents: monto,
      metodo: op.metodo,
    });
    registrarMovimiento(
      s,
      op,
      "abono",
      op.metodo === "efectivo" ? monto : 0,
      op.metodo === "transferencia" ? monto : 0,
      { deudaId: d.id },
    );
  } else if (op.tipo === "anularAbono") {
    const d = s.deudas.find((d) => d.id === op.deudaId);
    exigir(d && !d.anuladaPor, "Deuda no disponible.");
    const a = d.abonos.find((a) => a.id === op.abonoId);
    exigir(
      a && !a.inicial && !a.anuladaPor,
      "Abono no disponible para anular.",
    );
    texto(op.motivo, "Motivo");
    // Se conserva el registro original; saldoDeuda ignora los abonos anulados.
    a.anuladaPor = op.id;
    registrarMovimiento(
      s,
      op,
      "anulacionAbono",
      a.metodo === "efectivo" ? -a.montoCents : 0,
      a.metodo === "transferencia" ? -a.montoCents : 0,
      { deudaId: d.id, abonoId: a.id, motivo: op.motivo },
    );
  } else if (op.tipo === "anularVenta") {
    const v = s.ventas.find((v) => v.id === op.ventaId && v.tipo === "venta");
    exigir(v && !v.anuladaPor, "La venta ya fue anulada o no existe.");
    texto(op.motivo, "Motivo");
    for (const l of v.lineas) {
      const p = s.productos.find((p) => p.id === l.productoId);
      exigir(p, "Producto de la venta no encontrado.");
      p.activo = true;
      p.stockQ = entero(p.stockQ + l.cantidadQ, "Stock");
      p.valorCents = entero(p.valorCents + l.costoCents, "Valor de inventario");
    }
    const cobroVenta = s.movimientos.find(
      (m) => m.ventaId === v.id && m.tipo === "venta",
    );
    let efectivo = cobroVenta.cashCents;
    let transferencia = cobroVenta.transferCents;
    const d = s.deudas.find((d) => d.ventaId === v.id);
    if (d) {
      for (const a of d.abonos.filter((a) => !a.inicial && !a.anuladaPor)) {
        if (a.metodo === "efectivo") efectivo += a.montoCents;
        if (a.metodo === "transferencia") transferencia += a.montoCents;
      }
      d.anuladaPor = op.id;
    }
    v.anuladaPor = op.id;
    s.ventas.push({
      id: op.id,
      fecha: op.fecha,
      tipo: "devolucion",
      ventaOriginalId: v.id,
      motivo: op.motivo,
      totalCents: -v.totalCents,
      costoCents: -v.costoCents,
      lineas: v.lineas.map((l) => ({
        ...l,
        cantidadQ: -l.cantidadQ,
        totalCents: -l.totalCents,
        costoCents: -l.costoCents,
      })),
    });
    registrarMovimiento(s, op, "devolucion", -efectivo, -transferencia, {
      ventaId: v.id,
      entradas: v.lineas.map((l) => ({
        productoId: l.productoId,
        deltaQ: l.cantidadQ,
        costoCents: l.costoCents,
      })),
      motivo: op.motivo,
    });
  } else if (op.tipo === "merma") {
    const p = producto(s, op.productoId);
    const q = entero(op.cantidadQ, "Cantidad");
    exigir(
      p.unidad !== "unidad" || q % 1000 === 0,
      "Cantidad por unidad debe ser entera.",
    );
    const costo = costoSalida(p, q);
    p.stockQ -= q;
    p.valorCents -= costo;
    s.mermas.push({
      id: op.id,
      fecha: op.fecha,
      productoId: p.id,
      nombre: p.nombre,
      unidad: p.unidad,
      cantidadQ: q,
      costoCents: costo,
      motivo: texto(op.motivo, "Motivo"),
      historica: false,
    });
    registrarMovimiento(s, op, "merma", 0, 0, {
      productoId: p.id,
      deltaQ: -q,
      costoCents: -costo,
    });
  } else if (op.tipo === "anularMerma") {
    const m = s.mermas.find((m) => m.id === op.mermaId);
    exigir(
      m && m.productoId && !m.historica && !m.anuladaPor && m.cantidadQ > 0,
      "Merma no disponible para anular.",
    );
    texto(op.motivo, "Motivo");
    const p = s.productos.find((p) => p.id === m.productoId);
    p.activo = true;
    p.stockQ = entero(p.stockQ + m.cantidadQ);
    p.valorCents = entero(p.valorCents + m.costoCents);
    m.anuladaPor = op.id;
    s.mermas.push({
      ...m,
      id: op.id,
      fecha: op.fecha,
      cantidadQ: -m.cantidadQ,
      costoCents: -m.costoCents,
      anuladaPor: null,
      mermaOriginalId: m.id,
      motivo: `Anulación: ${op.motivo}`,
    });
    registrarMovimiento(s, op, "anulacionMerma", 0, 0, {
      productoId: p.id,
      deltaQ: m.cantidadQ,
      costoCents: m.costoCents,
      motivo: op.motivo,
    });
  } else if (op.tipo === "anularGasto") {
    const m = s.movimientos.find(
      (m) => m.id === op.movimientoId && m.tipo === "gasto" && m.montoCents > 0,
    );
    exigir(m && !m.anuladaPor, "Gasto no disponible para anular.");
    texto(op.motivo, "Motivo");
    m.anuladaPor = op.id;
    registrarMovimiento(s, op, "gasto", -m.cashCents, -m.transferCents, {
      montoCents: -m.montoCents,
      movimientoOriginalId: m.id,
      concepto: `Anulación: ${op.motivo}`,
    });
  } else if (op.tipo === "ajusteStock") {
    const p = producto(s, op.productoId);
    const nuevo = entero(op.stockQ, "Stock contado");
    texto(op.motivo, "Motivo");
    exigir(
      p.unidad !== "unidad" || nuevo % 1000 === 0,
      "Stock por unidad debe ser entero.",
    );
    const delta = nuevo - p.stockQ;
    exigir(delta !== 0, "El stock contado coincide con el registrado.");
    const valor =
      delta < 0
        ? -costoSalida(p, -delta)
        : importeCantidad(entero(op.costoCents, "Costo por unidad"), delta);
    p.stockQ = nuevo;
    p.valorCents = entero(p.valorCents + valor, "Valor de inventario");
    if (delta < 0)
      s.mermas.push({
        id: op.id,
        fecha: op.fecha,
        productoId: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        cantidadQ: -delta,
        costoCents: -valor,
        motivo: `Ajuste: ${op.motivo}`,
        historica: false,
      });
    registrarMovimiento(s, op, "ajusteStock", 0, 0, {
      productoId: p.id,
      deltaQ: delta,
      costoCents: valor,
      motivo: op.motivo,
    });
  } else if (["gasto", "aporte", "retiro"].includes(op.tipo)) {
    const monto = entero(op.montoCents, "Importe");
    exigir(monto > 0, "El importe debe ser positivo.");
    texto(op.concepto, "Concepto");
    exigir(
      ["efectivo", "transferencia"].includes(op.metodo),
      "Medio de pago inválido.",
    );
    const signo = op.tipo === "aporte" ? 1 : -1;
    registrarMovimiento(
      s,
      op,
      op.tipo,
      op.metodo === "efectivo" ? signo * monto : 0,
      op.metodo === "transferencia" ? signo * monto : 0,
      { concepto: op.concepto, montoCents: monto },
    );
  } else if (op.tipo === "abrirCaja") {
    exigir(
      !s.movimientos.some(
        (m) => m.tipo === "apertura" && diaEcuador(m.fecha) === dia,
      ),
      "Ya registraste el fondo inicial de hoy.",
    );
    registrarMovimiento(
      s,
      op,
      "apertura",
      entero(op.fondoCents, "Fondo inicial"),
    );
  } else if (op.tipo === "cerrarCaja") {
    exigir(
      s.movimientos.some(
        (m) => m.tipo === "apertura" && diaEcuador(m.fecha) === dia,
      ),
      "Registra el fondo inicial antes de cerrar.",
    );
    const esperado = sumar(
      s.movimientos
        .filter((m) => diaEcuador(m.fecha) === dia)
        .map((m) => m.cashCents),
    );
    const contado = entero(op.contadoCents, "Efectivo contado");
    s.cierres.push({
      id: op.id,
      fecha: op.fecha,
      dia,
      esperadoCents: esperado,
      contadoCents: contado,
      diferenciaCents: contado - esperado,
      revision: s.revision + 1,
    });
  } else throw new Error("Operación desconocida.");
  s.revision++;
  s.auditoria.push({
    id: op.id,
    fecha: op.fecha,
    tipo: op.tipo,
    motivo: op.motivo || null,
  });
  validarEstado(s);
  return s;
}

export function rangoPeriodo(periodo, hoy = new Date()) {
  if (periodo && typeof periodo === "object") {
    for (const f of [periodo.inicio, periodo.fin])
      exigir(
        typeof f === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(f) &&
          Number.isFinite(Date.parse(`${f}T12:00:00Z`)) &&
          new Date(`${f}T12:00:00Z`).toISOString().slice(0, 10) === f,
        "Fecha de periodo inválida.",
      );
    exigir(
      periodo.inicio <= periodo.fin,
      "La fecha inicial no puede ser posterior a la final.",
    );
    return { inicio: periodo.inicio, fin: periodo.fin };
  }
  const fin = diaEcuador(hoy);
  const d = new Date(`${fin}T12:00:00Z`);
  let inicio = fin;
  if (periodo === "7dias") {
    d.setUTCDate(d.getUTCDate() - 6);
    inicio = d.toISOString().slice(0, 10);
  } else if (periodo === "mes") inicio = `${fin.slice(0, 7)}-01`;
  else if (periodo === "ano") inicio = `${fin.slice(0, 4)}-01-01`;
  else if (periodo === "todo") inicio = "0000-01-01";
  else exigir(periodo === "hoy", "Periodo inválido.");
  return { inicio, fin };
}
export function reporte(s, periodo = "hoy", hoy = new Date()) {
  const { inicio, fin } = rangoPeriodo(periodo, hoy);
  const dias = new Map();
  const dia = (fecha) => {
    if (!dias.has(fecha)) dias.set(fecha, diaEcuador(fecha));
    return dias.get(fecha);
  };
  const enRango = (r) => {
    const d = dia(r.fecha);
    return d >= inicio && d <= fin;
  };
  const ventas = s.ventas.filter(enRango),
    mermas = s.mermas.filter(enRango),
    movimientos = s.movimientos.filter(enRango);
  const ventasCents = sumar(ventas.map((v) => v.totalCents)),
    costoCents = sumar(ventas.map((v) => v.costoCents)),
    mermaCents = sumar(mermas.map((m) => m.costoCents));
  const gastosCents = sumar(
    movimientos.filter((m) => m.tipo === "gasto").map((m) => m.montoCents),
  );
  const productos = s.productos
    .map((p) => {
      const ls = ventas
        .flatMap((v) => v.lineas)
        .filter((l) => l.productoId === p.id);
      const perdidas = mermas.filter((m) => m.productoId === p.id);
      return {
        ...p,
        vendidoQ: sumar(ls.map((l) => l.cantidadQ)),
        ventasCents: sumar(ls.map((l) => l.totalCents)),
        margenCents: sumar(ls.map((l) => l.totalCents - l.costoCents)),
        mermaCents: sumar(perdidas.map((m) => m.costoCents)),
      };
    })
    .sort((a, b) => b.vendidoQ - a.vendidoQ || b.ventasCents - a.ventasCents);
  const diario = [
    ...new Set([...ventas, ...mermas, ...movimientos].map((r) => dia(r.fecha))),
  ]
    .sort()
    .map((d) => {
      const ventasCents = sumar(
        ventas.filter((v) => dia(v.fecha) === d).map((v) => v.totalCents),
      );
      const costoCents = sumar(
        ventas.filter((v) => dia(v.fecha) === d).map((v) => v.costoCents),
      );
      const mermaCents = sumar(
        mermas.filter((m) => dia(m.fecha) === d).map((m) => m.costoCents),
      );
      const gastosCents = sumar(
        movimientos
          .filter((m) => m.tipo === "gasto" && dia(m.fecha) === d)
          .map((m) => m.montoCents),
      );
      return {
        dia: d,
        ventasCents,
        costoCents,
        mermaCents,
        gastosCents,
        resultadoCents: ventasCents - costoCents - mermaCents - gastosCents,
      };
    });
  return {
    inicio,
    fin,
    ventasCents,
    costoCents,
    margenCents: ventasCents - costoCents,
    mermaCents,
    gastosCents,
    resultadoCents: ventasCents - costoCents - mermaCents - gastosCents,
    cantidadVentas: ventas.filter((v) => v.tipo === "venta").length,
    productos,
    diario,
    pendientesCents: sumar(s.deudas.map(saldoDeuda)),
    inventarioCents: sumar(s.productos.map((p) => p.valorCents)),
    cobrosCents: sumar(
      movimientos
        .filter((m) =>
          ["venta", "abono", "devolucion", "anulacionAbono"].includes(m.tipo),
        )
        .map((m) => m.cashCents + m.transferCents),
    ),
  };
}

export function migrarLegado(datos) {
  validarRespaldo(datos);
  const s = crearEstado();
  s.tienda = copia(datos.tienda);
  s.legado = copia(datos);
  s.productos = datos.productos.map((p) => ({
    id: `legacy:p:${p.id}`,
    nombre: p.nombre,
    unidad: "unidad",
    precioCents: centavos(p.precioVenta),
    costoReferenciaCents: centavos(p.precioCompra),
    stockQ: p.stock * 1000,
    minimoQ: p.stockMinimo * 1000,
    valorCents: centavos(p.precioCompra) * p.stock,
    activo: true,
  }));
  // No se infiere que dos nombres iguales representan a la misma persona.
  for (const f of datos.fiados) {
    const clienteId = `legacy:c:${f.id}`;
    s.clientes.push({
      id: clienteId,
      nombre: f.nombre,
      telefono: f.telefono,
      importado: true,
    });
    s.deudas.push({
      id: `legacy:d:${f.id}`,
      clienteId,
      fecha: f.fecha,
      montoCents: centavos(f.monto),
      abonos: f.abonos.map((a, i) => ({
        id: `legacy:a:${f.id}:${i}`,
        fecha: a.fecha,
        montoCents: centavos(a.monto),
        metodo: "historico",
        inicial: true,
      })),
      ventaId: null,
      origen: "importado",
    });
  }
  s.mermas = datos.mermas.map((m) => ({
    id: `legacy:m:${m.id}`,
    fecha: m.fecha,
    productoId: null,
    nombre: m.producto,
    unidad: "unidad",
    cantidadQ: m.cantidad * 1000,
    costoCents: centavos(m.valor),
    motivo: m.motivo,
    historica: true,
  }));
  validarEstado(s);
  return s;
}

export function validarEstado(s) {
  exigir(s && s.version === 3, "Formato de datos no compatible.");
  entero(s.revision, "Revisión");
  if (s.tienda !== null) {
    texto(s.tienda.nombreTienda);
    texto(s.tienda.nombreDueno);
    exigir(typeof s.tienda.telefono === "string", "Teléfono inválido.");
  }
  for (const clave of [
    "productos",
    "clientes",
    "deudas",
    "ventas",
    "mermas",
    "movimientos",
    "cierres",
    "auditoria",
  ]) {
    exigir(Array.isArray(s[clave]), `Falta la colección ${clave}.`);
    const ids = new Set();
    for (const r of s[clave]) {
      exigir(
        r && typeof r.id === "string" && r.id && !ids.has(r.id),
        `ID inválido o duplicado en ${clave}.`,
      );
      ids.add(r.id);
    }
  }
  const pids = new Set(s.productos.map((p) => p.id)),
    cids = new Set(s.clientes.map((c) => c.id));
  for (const p of s.productos) {
    texto(p.nombre);
    exigir(
      ["unidad", "kg", "litro"].includes(p.unidad) &&
        typeof p.activo === "boolean",
      "Producto inválido.",
    );
    for (const k of [
      "stockQ",
      "minimoQ",
      "precioCents",
      "costoReferenciaCents",
      "valorCents",
    ])
      entero(p[k], k);
    exigir(
      p.stockQ !== 0 || p.valorCents === 0,
      "Existencias vacías con valor residual.",
    );
    exigir(
      p.unidad !== "unidad" ||
        (p.stockQ % 1000 === 0 && p.minimoQ % 1000 === 0),
      "Existencias fraccionadas por unidad.",
    );
  }
  for (const c of s.clientes) {
    texto(c.nombre);
    exigir(typeof c.telefono === "string", "Teléfono inválido.");
  }
  const fechaValida = (f) =>
    exigir(
      typeof f === "string" &&
        /^\d{4}-\d{2}-\d{2}T/.test(f) &&
        Number.isFinite(Date.parse(f)),
      "Fecha inválida.",
    );
  for (const d of s.deudas) {
    exigir(
      cids.has(d.clienteId) && Array.isArray(d.abonos),
      "Cliente o abonos inválidos.",
    );
    entero(d.montoCents);
    fechaValida(d.fecha);
    const ids = new Set();
    for (const a of d.abonos) {
      exigir(typeof a.id === "string" && !ids.has(a.id), "Abono duplicado.");
      ids.add(a.id);
      entero(a.montoCents);
      exigir(a.montoCents > 0, "Abono vacío.");
      fechaValida(a.fecha);
      exigir(
        ["efectivo", "transferencia", "historico"].includes(a.metodo),
        "Abono inválido.",
      );
    }
    exigir(saldoDeuda(d) >= 0, "Abonos superiores a la deuda.");
  }
  for (const v of s.ventas) {
    fechaValida(v.fecha);
    exigir(
      ["venta", "devolucion"].includes(v.tipo) &&
        Array.isArray(v.lineas) &&
        v.lineas.length > 0,
      "Venta inválida.",
    );
    for (const l of v.lineas) {
      exigir(pids.has(l.productoId), "Producto de venta desconocido.");
      texto(l.nombre);
      exigir(
        [l.cantidadQ, l.precioCents, l.totalCents, l.costoCents].every(
          Number.isSafeInteger,
        ),
        "Línea de venta inválida.",
      );
      exigir(
        v.tipo === "venta"
          ? l.cantidadQ > 0 && l.totalCents > 0 && l.costoCents >= 0
          : l.cantidadQ < 0 && l.totalCents < 0 && l.costoCents <= 0,
        "Signo de venta inválido.",
      );
      exigir(
        Math.abs(l.totalCents) ===
          importeCantidad(l.precioCents, Math.abs(l.cantidadQ)),
        "Importe de venta inconsistente.",
      );
    }
    exigir(
      v.totalCents === sumar(v.lineas.map((l) => l.totalCents)) &&
        v.costoCents === sumar(v.lineas.map((l) => l.costoCents)),
      "Total de venta inconsistente.",
    );
  }
  for (const m of s.mermas) {
    fechaValida(m.fecha);
    exigir(
      Number.isSafeInteger(m.cantidadQ) &&
        Number.isSafeInteger(m.costoCents) &&
        (m.mermaOriginalId
          ? m.cantidadQ < 0 && m.costoCents <= 0
          : m.cantidadQ > 0 && m.costoCents >= 0),
      "Merma inválida.",
    );
    texto(m.nombre);
    texto(m.motivo);
    exigir(
      m.productoId === null || pids.has(m.productoId),
      "Producto de merma desconocido.",
    );
  }
  for (const m of s.movimientos) {
    fechaValida(m.fecha);
    texto(m.tipo);
    exigir(
      Number.isSafeInteger(m.cashCents) &&
        Number.isSafeInteger(m.transferCents),
      "Movimiento monetario inválido.",
    );
    if (m.tipo === "gasto") {
      exigir(
        Number.isSafeInteger(m.montoCents) &&
          (m.movimientoOriginalId ? m.montoCents < 0 : m.montoCents > 0),
        "Gasto inválido.",
      );
      exigir(
        m.cashCents + m.transferCents === -m.montoCents,
        "Gasto inconsistente.",
      );
    }
  }
  for (const c of s.cierres) {
    fechaValida(c.fecha);
    entero(c.contadoCents);
    exigir(
      Number.isSafeInteger(c.esperadoCents) &&
        c.diferenciaCents === c.contadoCents - c.esperadoCents &&
        c.dia === diaEcuador(c.fecha),
      "Cierre inconsistente.",
    );
    entero(c.revision);
  }
  for (const a of s.auditoria) {
    fechaValida(a.fecha);
    texto(a.tipo);
  }
  exigir(
    s.revision === s.auditoria.length,
    "Revisión e historial inconsistentes.",
  );
  const auditoria = new Set(s.auditoria.map((a) => a.id));
  for (const m of s.movimientos)
    exigir(auditoria.has(m.id), "Movimiento sin operación de origen.");
  // Reconciliar cantidades/valor con los movimientos, partiendo solo del stock legado.
  for (const p of s.productos) {
    const legado = s.legado?.productos?.find(
      (x) => `legacy:p:${x.id}` === p.id,
    );
    let q = legado ? legado.stock * 1000 : 0,
      valor = legado ? centavos(legado.precioCompra) * legado.stock : 0;
    for (const m of s.movimientos) {
      if (m.productoId === p.id) {
        exigir(
          Number.isSafeInteger(m.deltaQ) && Number.isSafeInteger(m.costoCents),
          "Movimiento de inventario inválido.",
        );
        q += m.deltaQ;
        valor += m.costoCents;
      }
      for (const lineas of [m.salidas, m.entradas]) {
        if (lineas !== undefined) {
          exigir(Array.isArray(lineas), "Movimiento de inventario inválido.");
          for (const l of lineas.filter((l) => l.productoId === p.id)) {
            exigir(
              Number.isSafeInteger(l.deltaQ) &&
                Number.isSafeInteger(l.costoCents),
              "Línea de inventario inválida.",
            );
            q += l.deltaQ;
            valor += l.costoCents;
          }
        }
      }
      exigir(
        Number.isSafeInteger(q) &&
          q >= 0 &&
          Number.isSafeInteger(valor) &&
          valor >= 0,
        "Historial de inventario inconsistente.",
      );
    }
    exigir(
      q === p.stockQ && valor === p.valorCents,
      "Stock o valor no coincide con el historial de movimientos.",
    );
  }
  for (const d of s.deudas) {
    if (d.ajustes !== undefined) {
      exigir(Array.isArray(d.ajustes), "Historial de deuda inválido.");
      for (const a of d.ajustes) {
        entero(a.anteriorCents);
        entero(a.nuevoCents);
        texto(a.motivo);
        fechaValida(a.fecha);
        exigir(auditoria.has(a.id), "Corrección sin historial.");
      }
    }
    if (d.ventaId)
      exigir(
        s.ventas.some(
          (v) =>
            v.id === d.ventaId &&
            v.tipo === "venta" &&
            v.totalCents === d.montoCents,
        ),
        "Deuda sin venta consistente.",
      );
  }
  for (const v of s.ventas) {
    if (v.tipo === "devolucion") {
      const original = s.ventas.find(
        (x) => x.id === v.ventaOriginalId && x.tipo === "venta",
      );
      exigir(
        original &&
          original.anuladaPor === v.id &&
          v.totalCents === -original.totalCents &&
          v.costoCents === -original.costoCents,
        "Devolución inconsistente.",
      );
    } else {
      const m = s.movimientos.find((m) => m.id === v.id && m.tipo === "venta");
      exigir(
        m && Array.isArray(m.salidas) && m.salidas.length === v.lineas.length,
        "Venta sin movimiento de inventario.",
      );
      for (const l of v.lineas)
        exigir(
          m.salidas.some(
            (x) =>
              x.productoId === l.productoId &&
              x.deltaQ === -l.cantidadQ &&
              x.costoCents === -l.costoCents,
          ),
          "Salida de venta inconsistente.",
        );
      const d = s.deudas.find((d) => d.ventaId === v.id);
      const cobrado =
        v.metodo === "fiado"
          ? sumar(
              (d?.abonos || [])
                .filter((a) => a.inicial)
                .map((a) => a.montoCents),
            )
          : v.totalCents;
      exigir(
        m.cashCents >= 0 &&
          m.transferCents >= 0 &&
          m.cashCents + m.transferCents === cobrado,
        "Cobro de venta inconsistente.",
      );
      exigir(v.metodo !== "fiado" || d, "Fiado sin deuda vinculada.");
    }
  }
  for (const m of s.mermas.filter((m) => m.mermaOriginalId)) {
    const original = s.mermas.find((x) => x.id === m.mermaOriginalId);
    exigir(
      original &&
        original.anuladaPor === m.id &&
        m.cantidadQ === -original.cantidadQ &&
        m.costoCents === -original.costoCents,
      "Anulación de merma inconsistente.",
    );
  }
  for (const m of s.movimientos.filter((m) => m.movimientoOriginalId)) {
    const original = s.movimientos.find((x) => x.id === m.movimientoOriginalId);
    exigir(
      original &&
        original.anuladaPor === m.id &&
        m.cashCents === -original.cashCents &&
        m.transferCents === -original.transferCents &&
        m.montoCents === -original.montoCents,
      "Anulación de gasto inconsistente.",
    );
  }

  return s;
}
