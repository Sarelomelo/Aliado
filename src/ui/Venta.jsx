import { useState } from "react";
import {
  cantidad,
  cantidadTexto,
  dinero,
  importeCantidad,
} from "../negocio.js";
import { centavos } from "../datos.js";
import { Boton, Campo, Formulario, Importe, Metodo } from "./comun.jsx";

export default function Venta({
  estado: s,
  actuar,
  ocupado,
  carrito,
  setCarrito,
}) {
  const [busqueda, setBusqueda] = useState(""),
    [metodo, setMetodo] = useState("efectivo"),
    [cliente, setCliente] = useState(""),
    [abono, setAbono] = useState("0"),
    [metodoAbono, setMetodoAbono] = useState("efectivo");
  const productos = s.productos.filter(
    (p) => p.activo && p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  function agregar(p) {
    setCarrito((xs) =>
      xs.some((l) => l.productoId === p.id)
        ? xs.map((l) =>
            l.productoId === p.id
              ? { ...l, textoCantidad: String(Number(l.textoCantidad) + 1) }
              : l,
          )
        : [
            ...xs,
            {
              productoId: p.id,
              nombre: p.nombre,
              unidad: p.unidad,
              precioCents: p.precioCents,
              textoCantidad: "1",
            },
          ],
    );
  }
  let total = 0,
    valido = true;
  try {
    total = carrito.reduce(
      (sum, l) =>
        sum +
        importeCantidad(l.precioCents, cantidad(l.textoCantidad, l.unidad)),
      0,
    );
  } catch {
    valido = false;
  }
  async function confirmar(e) {
    e.preventDefault();
    const ok = await actuar("venta", {
      lineas: carrito.map((l) => ({
        productoId: l.productoId,
        cantidadQ: cantidad(l.textoCantidad, l.unidad),
        precioCents: l.precioCents,
      })),
      metodo,
      clienteId: cliente,
      abonoInicialCents: centavos(abono || "0"),
      metodoAbono,
    });
    if (ok) {
      setCarrito([]);
      setAbono("0");
    }
  }
  return (
    <>
      <h2>Venta rápida</h2>
      <p>
        Toca un producto para añadirlo. Confirma una sola vez al terminar la
        compra.
      </p>
      <div className="venta-layout">
        <section>
          <Campo
            label="Buscar producto"
            placeholder="Leche, pan…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="catalogo">
            {productos.map((p) => (
              <button
                key={p.id}
                className="producto"
                disabled={!p.stockQ || ocupado}
                onClick={() => agregar(p)}
              >
                <strong>{p.nombre}</strong>
                <span>
                  {dinero(p.precioCents)} / {p.unidad}
                </span>
                <small>Stock: {cantidadTexto(p.stockQ)}</small>
              </button>
            ))}
          </div>
          {!productos.length && (
            <p>Registra productos en Inventario para empezar.</p>
          )}
        </section>
        <section className="carrito">
          <h3>Compra actual</h3>
          {!carrito.length && <p>El carrito está vacío.</p>}
          <Formulario onSubmit={confirmar} className="formulario">
            {carrito.map((l) => (
              <div className="linea-carrito" key={l.productoId}>
                <strong>{l.nombre}</strong>
                <Campo
                  label={`Cantidad de ${l.nombre}`}
                  type="number"
                  min={l.unidad === "unidad" ? "1" : "0.001"}
                  step={l.unidad === "unidad" ? "1" : "0.001"}
                  value={l.textoCantidad}
                  onChange={(e) =>
                    setCarrito((xs) =>
                      xs.map((x) =>
                        x.productoId === l.productoId
                          ? { ...x, textoCantidad: e.target.value }
                          : x,
                      ),
                    )
                  }
                  required
                />
                <button
                  type="button"
                  className="enlace"
                  onClick={() =>
                    setCarrito((xs) =>
                      xs.filter((x) => x.productoId !== l.productoId),
                    )
                  }
                >
                  Quitar {l.nombre}
                </button>
              </div>
            ))}
            <div className="total">
              Total{" "}
              <strong>{valido ? dinero(total) : "Revisa cantidades"}</strong>
            </div>
            <Metodo valor={metodo} cambiar={setMetodo} fiado />
            {metodo === "fiado" && (
              <>
                <Campo label="Cliente del fiado">
                  <select
                    required
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                  >
                    <option value="">Seleccionar cliente</option>
                    {s.clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} · {c.telefono || c.id.slice(-6)}
                      </option>
                    ))}
                  </select>
                </Campo>
                <p>
                  Registra primero al cliente en Fiados y clientes si no
                  aparece.
                </p>
                <Importe
                  label="Abono inicial (opcional)"
                  value={abono}
                  onChange={(e) => setAbono(e.target.value)}
                />
                <Campo label="Medio del abono inicial">
                  <select
                    value={metodoAbono}
                    onChange={(e) => setMetodoAbono(e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </Campo>
              </>
            )}
            <Boton disabled={ocupado || !valido || total <= 0}>
              {ocupado ? "Guardando…" : "Confirmar venta"}
            </Boton>
          </Formulario>
        </section>
      </div>
    </>
  );
}
