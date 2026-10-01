import { useState } from "react";
import { cantidad, cantidadTexto, dinero } from "../negocio.js";
import { centavos } from "../datos.js";
import { Boton, Campo, Formulario, Importe, Metodo } from "./comun.jsx";

export default function Inventario({ estado: s, actuar, ocupado }) {
  const [vista, setVista] = useState("lista"),
    [seleccion, setSeleccion] = useState(""),
    [nombre, setNombre] = useState(""),
    [unidad, setUnidad] = useState("unidad"),
    [precio, setPrecio] = useState(""),
    [costo, setCosto] = useState(""),
    [stock, setStock] = useState(""),
    [minimo, setMinimo] = useState(""),
    [motivo, setMotivo] = useState("Dañado"),
    [metodo, setMetodo] = useState("efectivo"),
    [buscar, setBuscar] = useState("");
  const p = s.productos.find((p) => p.id === seleccion);
  function abrir(tipo, prod) {
    setVista(tipo);
    setSeleccion(prod?.id || "");
    setNombre(prod?.nombre || "");
    setUnidad(prod?.unidad || "unidad");
    setPrecio(prod ? String(prod.precioCents / 100) : "");
    setCosto(prod ? String(prod.costoReferenciaCents / 100) : "");
    setStock("");
    setMinimo(prod ? String(prod.minimoQ / 1000) : "");
    setMotivo(tipo === "merma" ? "Dañado" : "");
    setMetodo("efectivo");
  }
  async function guardar(e) {
    e.preventDefault();
    let tipo, datos;
    if (vista === "nuevo") {
      tipo = "producto";
      datos = {
        nombre,
        unidad,
        precioCents: centavos(precio),
        costoCents: centavos(costo),
        stockQ: cantidad(stock || "0", unidad),
        minimoQ: cantidad(minimo || "0", unidad),
      };
    } else if (vista === "editar") {
      tipo = "editarProducto";
      datos = {
        productoId: p.id,
        nombre,
        precioCents: centavos(precio),
        minimoQ: cantidad(minimo || "0", p.unidad),
      };
    } else if (vista === "entrada") {
      tipo = "entrada";
      datos = {
        productoId: p.id,
        cantidadQ: cantidad(stock, p.unidad),
        costoTotalCents: centavos(costo),
        metodo,
      };
    } else if (vista === "merma") {
      tipo = "merma";
      datos = {
        productoId: p.id,
        cantidadQ: cantidad(stock, p.unidad),
        motivo,
      };
    } else {
      tipo = "ajusteStock";
      datos = {
        productoId: p.id,
        stockQ: cantidad(stock, p.unidad),
        motivo,
        costoCents: centavos(costo || "0"),
      };
    }
    if (await actuar(tipo, datos)) setVista("lista");
  }
  if (vista !== "lista")
    return (
      <section>
        <h2>
          {
            {
              nuevo: "Nuevo producto",
              editar: "Editar producto",
              entrada: "Reponer inventario",
              merma: "Registrar merma",
              ajuste: "Corregir stock contado",
            }[vista]
          }
          {p ? ` · ${p.nombre}` : ""}
        </h2>
        <Formulario className="formulario" onSubmit={guardar}>
          {["nuevo", "editar"].includes(vista) && (
            <>
              <Campo
                label="Nombre del producto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
              <Importe
                label="Precio de venta por unidad de medida"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
              />
              <Campo
                label="Stock mínimo"
                type="number"
                min="0"
                step={unidad === "unidad" ? "1" : "0.001"}
                value={minimo}
                onChange={(e) => setMinimo(e.target.value)}
              />
            </>
          )}
          {vista === "nuevo" && (
            <Campo label="Unidad de medida">
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo</option>
                <option value="litro">Litro</option>
              </select>
            </Campo>
          )}
          {vista !== "editar" && (
            <Campo
              label={
                vista === "ajuste"
                  ? "Stock contado"
                  : vista === "nuevo"
                    ? "Stock inicial"
                    : `Cantidad (${unidad})`
              }
              type="number"
              min="0"
              step={unidad === "unidad" ? "1" : "0.001"}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          )}
          {["nuevo", "entrada", "ajuste"].includes(vista) && (
            <Importe
              label={
                vista === "entrada"
                  ? "Costo TOTAL de la compra"
                  : "Costo de compra por unidad de medida"
              }
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              required={vista !== "ajuste"}
            />
          )}
          {vista === "entrada" && (
            <>
              <Metodo valor={metodo} cambiar={setMetodo} />
              <p>
                El costo se incorpora al inventario; se descuenta del medio de
                pago elegido. No lo registres otra vez como gasto.
              </p>
            </>
          )}
          {["merma", "ajuste"].includes(vista) && (
            <>
              <Campo
                label="Motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              />
              <p>
                La salida reduce existencias y registra la pérdida al costo. Los
                aumentos por ajuste necesitan su costo y no registran un pago.
              </p>
            </>
          )}
          <div className="acciones">
            <Boton disabled={ocupado}>Guardar movimiento</Boton>
            <Boton type="button" secundario onClick={() => setVista("lista")}>
              Cancelar
            </Boton>
          </div>
        </Formulario>
      </section>
    );
  return (
    <>
      <div className="titulo-fila">
        <h2>Inventario</h2>
        <Boton onClick={() => abrir("nuevo")}>Nuevo producto</Boton>
      </div>
      <Campo
        label="Buscar en inventario"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />
      <div className="lista">
        {s.productos
          .filter(
            (p) =>
              p.activo && p.nombre.toLowerCase().includes(buscar.toLowerCase()),
          )
          .map((p) => (
            <section key={p.id} className="item">
              <div className="titulo-fila">
                <h3>{p.nombre}</h3>
                <strong>{dinero(p.valorCents)}</strong>
              </div>
              <p>
                Stock:{" "}
                <strong>
                  {cantidadTexto(p.stockQ)} {p.unidad}
                </strong>{" "}
                · venta: {dinero(p.precioCents)} / {p.unidad}
              </p>
              <p>
                Costo medio actual:{" "}
                {p.stockQ
                  ? dinero(Math.round((p.valorCents * 1000) / p.stockQ))
                  : "Sin existencias"}{" "}
                · mínimo: {cantidadTexto(p.minimoQ)}
              </p>
              {p.stockQ <= p.minimoQ && (
                <p className="aviso">Necesita reposición</p>
              )}
              <div className="acciones">
                <Boton secundario onClick={() => abrir("entrada", p)}>
                  Reponer
                </Boton>
                <Boton secundario onClick={() => abrir("merma", p)}>
                  Merma
                </Boton>
                <Boton secundario onClick={() => abrir("editar", p)}>
                  Editar
                </Boton>
                <Boton secundario onClick={() => abrir("ajuste", p)}>
                  Ajustar stock
                </Boton>
                {p.stockQ === 0 && (
                  <Boton
                    peligro
                    disabled={ocupado}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Archivar este producto? Se conserva su historial.",
                        )
                      )
                        actuar("archivarProducto", { productoId: p.id });
                    }}
                  >
                    Archivar
                  </Boton>
                )}
              </div>
            </section>
          ))}
      </div>
    </>
  );
}
