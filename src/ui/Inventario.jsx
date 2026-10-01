import { useState } from "react";
import { cantidad, cantidadTexto, dinero } from "../negocio.js";
import { centavos } from "../datos.js";
import { calcularCompra, nombreUnidad } from "../compras.js";
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
    [buscar, setBuscar] = useState(""),
    [porEnvases, setPorEnvases] = useState(false),
    [presentacion, setPresentacion] = useState("saco"),
    [envases, setEnvases] = useState(""),
    [contenido, setContenido] = useState("");
  const p = s.productos.find((p) => p.id === seleccion);
  const unidadTexto = nombreUnidad(unidad);
  let compra;
  if (porEnvases && envases && contenido && costo) {
    try {
      compra = calcularCompra({ unidad, envases, contenido, total: costo });
    } catch {
      /* Se explica al intentar guardar. */
    }
  }
  function abrir(tipo, prod) {
    setVista(tipo);
    setPorEnvases(false);
    setPresentacion(
      prod?.unidad === "litro"
        ? "bidón"
        : prod?.unidad === "unidad"
          ? "caja"
          : "saco",
    );
    setEnvases("");
    setContenido("");
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
      const compraInicial = porEnvases
        ? calcularCompra({ unidad, envases, contenido, total: costo })
        : null;
      datos = {
        nombre,
        unidad,
        precioCents: centavos(precio),
        costoCents: compraInicial?.costoCents ?? centavos(costo),
        stockQ: compraInicial?.stockQ ?? cantidad(stock || "0", unidad),
        ...(compraInicial
          ? { valorInicialCents: compraInicial.valorCents }
          : {}),
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
      const reposicion = porEnvases
        ? calcularCompra({ unidad, envases, contenido, total: costo })
        : null;
      datos = {
        productoId: p.id,
        cantidadQ: reposicion?.stockQ ?? cantidad(stock, p.unidad),
        costoTotalCents: reposicion?.valorCents ?? centavos(costo),
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
            <Campo
              label="Nombre del producto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          )}
          {vista === "nuevo" && (
            <Campo label="¿Cómo vendes este producto?">
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
              >
                <option value="unidad">Por unidad</option>
                <option value="kg">Por kilogramo</option>
                <option value="litro">Por litro</option>
              </select>
            </Campo>
          )}
          {["nuevo", "editar"].includes(vista) && (
            <Importe
              label={`¿A cuánto vendes cada ${unidadTexto}?`}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
          )}
          {["nuevo", "entrada"].includes(vista) && (
            <>
              <Campo label="¿Cómo quieres ingresar la cantidad?">
                <select
                  value={porEnvases ? "envases" : "directo"}
                  onChange={(e) => {
                    setPorEnvases(e.target.value === "envases");
                    setCosto("");
                  }}
                >
                  <option value="directo">
                    Indicar la cantidad directamente
                  </option>
                  <option value="envases">Por sacos, cajas o paquetes</option>
                </select>
              </Campo>
              {porEnvases && (
                <>
                  <Campo label="¿En qué presentación lo compraste?">
                    <select
                      value={presentacion}
                      onChange={(e) => setPresentacion(e.target.value)}
                    >
                      {["saco", "caja", "paquete", "bidón"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo
                    label="¿Cuántos envases compraste?"
                    type="number"
                    min="1"
                    step="1"
                    value={envases}
                    onChange={(e) => setEnvases(e.target.value)}
                    required
                  />
                  <Campo
                    label={`¿Cuántos ${unidad === "kg" ? "kilogramos" : unidad === "litro" ? "litros" : "productos"} contiene cada ${presentacion}?`}
                    type="number"
                    min={unidad === "unidad" ? "1" : "0.001"}
                    step={unidad === "unidad" ? "1" : "0.001"}
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    required
                  />
                </>
              )}
            </>
          )}
          {vista !== "editar" &&
            !(["nuevo", "entrada"].includes(vista) && porEnvases) && (
              <Campo
                label={
                  vista === "ajuste"
                    ? "¿Cuánto tienes al contar el producto?"
                    : vista === "nuevo"
                      ? `¿Cuántos ${unidad === "unidad" ? "productos" : unidad === "kg" ? "kilogramos" : "litros"} tienes ahora?`
                      : vista === "entrada"
                        ? `¿Cuánto vas a añadir? (${unidad})`
                        : `¿Cuánto producto se perdió? (${unidad})`
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
                vista === "entrada" || porEnvases
                  ? "¿Cuánto pagaste por toda la compra?"
                  : `¿Cuánto te costó cada ${unidadTexto}?`
              }
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              required={vista !== "ajuste"}
            />
          )}
          {vista === "nuevo" && !porEnvases && (
            <small>
              {unidad === "unidad"
                ? "Si compraste 10 por $7, escribe $0,70."
                : `Divide el costo de la compra entre los ${unidad === "kg" ? "kilogramos" : "litros"}. Por ejemplo: $40 ÷ 50 = $0,80 por ${unidadTexto}.`}
            </small>
          )}
          {["nuevo", "editar"].includes(vista) && (
            <div>
              <h3>Aviso para reponer (opcional)</h3>
              <Campo
                label="¿Con qué cantidad quieres que te avisemos para reponer?"
                type="number"
                min="0"
                step={unidad === "unidad" ? "1" : "0.001"}
                value={minimo}
                onChange={(e) => setMinimo(e.target.value)}
              />
              <small>
                Si lo dejas vacío, te avisaremos cuando se agote el producto.
              </small>
            </div>
          )}
          {porEnvases && ["nuevo", "entrada"].includes(vista) && compra && (
            <div className="nota" aria-live="polite">
              <strong>Aliado calcula por ti:</strong>
              <p>
                {envases} × {contenido} = {cantidadTexto(compra.stockQ)}{" "}
                {unidad} disponibles para vender.
              </p>
              <p>
                Total de la compra: {dinero(compra.valorCents)} · costo
                aproximado por {unidadTexto}: {dinero(compra.costoCents)}.
              </p>
              <small>
                Guardamos el costo total exacto, incluso cuando el costo por{" "}
                {unidadTexto} tiene más decimales.
              </small>
            </div>
          )}
          {vista === "nuevo" && (
            <small>
              Esta es la mercadería que ya tienes. Su registro inicial no
              descuenta dinero de caja. Para compras nuevas de un producto
              existente, usa Reponer.
            </small>
          )}
          {vista === "entrada" && (
            <>
              <Metodo valor={metodo} cambiar={setMetodo} />
              <p>
                Añadimos la compra a tus productos y registramos el pago. No
                necesitas anotarla también como gasto.
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
                Los productos perdidos se descuentan y se registra lo que te
                costaron. Si corriges una cantidad porque encontraste más
                productos, indica su costo; esa corrección no registra un pago.
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
                Disponible:{" "}
                <strong>
                  {cantidadTexto(p.stockQ)} {p.unidad}
                </strong>{" "}
                · venta: {dinero(p.precioCents)} / {p.unidad}
              </p>
              <p>
                Te cuesta aproximadamente cada {nombreUnidad(p.unidad)}:{" "}
                {p.stockQ
                  ? dinero(Math.round((p.valorCents * 1000) / p.stockQ))
                  : "Sin existencias"}{" "}
                · aviso para reponer: {cantidadTexto(p.minimoQ)}
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
