import { aplicarOperacion, crearEstado } from "./negocio.js";

export function crearSimulacion(hoy = new Date()) {
  const base = new Date(hoy);
  // Todas las operaciones del día demo caen en el mismo día de Ecuador.
  const fecha = base.toISOString();
  let s = crearEstado();
  const pasos = [];
  function hacer(id, tipo, datos) {
    s = aplicarOperacion(s, { id: `demo:${id}`, tipo, fecha, ...datos });
    pasos.push({ id, tipo });
  }
  hacer("tienda", "tienda", {
    nombreTienda: "Tienda de práctica",
    nombreDueno: "Comerciante ficticio",
    telefono: "",
  });
  hacer("leche", "producto", {
    nombre: "Leche 1 L",
    unidad: "unidad",
    precioCents: 100,
    costoCents: 70,
    stockQ: 10000,
    minimoQ: 3000,
  });
  hacer("pan", "producto", {
    nombre: "Pan",
    unidad: "unidad",
    precioCents: 25,
    costoCents: 15,
    stockQ: 20000,
    minimoQ: 5000,
  });
  hacer("arroz", "producto", {
    nombre: "Arroz",
    unidad: "kg",
    precioCents: 150,
    costoCents: 100,
    stockQ: 10000,
    minimoQ: 2000,
  });
  hacer("cliente", "cliente", { nombre: "Rosa (ficticia)", telefono: "" });
  hacer("abrir", "abrirCaja", { fondoCents: 2000 });
  hacer("venta1", "venta", {
    lineas: [
      { productoId: "demo:leche", cantidadQ: 2000, precioCents: 100 },
      { productoId: "demo:pan", cantidadQ: 4000, precioCents: 25 },
    ],
    metodo: "efectivo",
  });
  hacer("venta2", "venta", {
    lineas: [{ productoId: "demo:leche", cantidadQ: 3000, precioCents: 100 }],
    metodo: "fiado",
    clienteId: "demo:cliente",
    abonoInicialCents: 0,
  });
  hacer("abono", "abono", {
    deudaId: "demo:venta2",
    montoCents: 100,
    metodo: "efectivo",
  });
  hacer("merma", "merma", {
    productoId: "demo:leche",
    cantidadQ: 1000,
    motivo: "Envase dañado",
  });
  hacer("entrada", "entrada", {
    productoId: "demo:leche",
    cantidadQ: 5000,
    costoTotalCents: 400,
    metodo: "efectivo",
  });
  hacer("venta3", "venta", {
    lineas: [{ productoId: "demo:arroz", cantidadQ: 500, precioCents: 150 }],
    metodo: "transferencia",
  });
  hacer("gasto", "gasto", {
    montoCents: 50,
    concepto: "Fundas",
    metodo: "efectivo",
  });
  hacer("retiro", "retiro", {
    montoCents: 100,
    concepto: "Retiro personal",
    metodo: "efectivo",
  });
  hacer("cerrar", "cerrarCaja", { contadoCents: 1850 });
  return { estado: s, pasos };
}
