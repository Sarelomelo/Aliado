import { descargar } from "./descargar.js";
import { useMemo, useState } from "react";
import { cantidadTexto, dinero, reporte } from "../negocio.js";
import { diaEcuador } from "../datos.js";
import { Boton, Campo, Tarjeta, Fecha } from "./comun.jsx";

export default function Reportes({ estado: s, actuar, ocupado }) {
  const [desde, setDesde] = useState(diaEcuador().slice(0, 7) + "-01"),
    [hasta, setHasta] = useState(diaEcuador());
  const [periodo, setPeriodo] = useState("hoy"),
    [orden, setOrden] = useState("ventas"),
    [unidad, setUnidad] = useState("todas");
  const fechasValidas = desde && hasta && desde <= hasta;
  const hoy = diaEcuador();
  const r = useMemo(
    () =>
      reporte(
        s,
        periodo === "personalizado"
          ? fechasValidas
            ? { inicio: desde, fin: hasta }
            : "hoy"
          : periodo,
        new Date(`${hoy}T12:00:00-05:00`),
      ),
    [s, periodo, fechasValidas, desde, hasta, hoy],
  );
  const productos = r.productos
    .filter((p) => unidad === "todas" || p.unidad === unidad)
    .sort((a, b) =>
      orden === "ventas"
        ? b.ventasCents - a.ventasCents
        : orden === "margen"
          ? b.margenCents - a.margenCents
          : unidad === "todas"
            ? b.ventasCents - a.ventasCents
            : orden === "menos"
              ? a.vendidoQ - b.vendidoQ
              : b.vendidoQ - a.vendidoQ,
    );
  function csv() {
    const escapar = (x) =>
      `"${String(x)
        .replace(/^[=+\-@\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const filas = [
      [
        "Producto",
        "Unidad",
        "Cantidad neta vendida",
        "Ventas USD",
        "Margen bruto USD",
        "Merma USD",
      ],
      ...productos.map((p) => [
        p.nombre,
        p.unidad,
        p.vendidoQ / 1000,
        (p.ventasCents / 100).toFixed(2),
        (p.margenCents / 100).toFixed(2),
        (p.mermaCents / 100).toFixed(2),
      ]),
    ];
    descargar(
      `aliado-productos-${r.inicio}-${r.fin}.csv`,
      "\uFEFF" + filas.map((f) => f.map(escapar).join(",")).join("\r\n"),
    );
  }
  return (
    <>
      <h2>Rendimiento de la tienda</h2>
      <Campo label="Periodo del reporte">
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="hoy">Hoy</option>
          <option value="7dias">Últimos 7 días</option>
          <option value="mes">Este mes</option>
          <option value="ano">Este año</option>
          <option value="todo">Todo el historial</option>
          <option value="personalizado">Elegir fechas</option>
        </select>
      </Campo>
      {periodo === "personalizado" && (
        <div className="dos-columnas">
          <Campo
            label="Desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <Campo
            label="Hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      )}
      {periodo === "personalizado" && !fechasValidas && (
        <p className="aviso">
          Revisa las fechas; se muestra hoy mientras las corriges.
        </p>
      )}
      <p>
        {r.inicio} a {r.fin} · horario de Ecuador
      </p>
      <div className="indicadores">
        <Tarjeta
          label="Ventas registradas, descontando devoluciones"
          valor={dinero(r.ventasCents)}
        />
        <Tarjeta
          label="Lo que te costaron los productos vendidos"
          valor={dinero(r.costoCents)}
        />
        <Tarjeta
          label="Lo que queda de las ventas antes de gastos y pérdidas"
          valor={dinero(r.margenCents)}
        />
        <Tarjeta
          label="Costo de los productos dañados o perdidos"
          valor={dinero(r.mermaCents)}
          tono="naranja"
        />
        <Tarjeta label="Gastos registrados" valor={dinero(r.gastosCents)} />
        <Tarjeta
          label="Resultado después de gastos y productos perdidos"
          valor={dinero(r.resultadoCents)}
          detalle="Margen − merma − gastos"
        />
      </div>
      <p className="nota">
        Estos resultados dependen de lo registrado. No incluyen impuestos,
        gastos omitidos ni ajustes contables externos. Compras de mercadería se
        incorporan al costo del inventario; los abonos no duplican ventas. Los
        registros antiguos no permiten reconstruir ventas por producto.
      </p>
      <section>
        <div className="titulo-fila">
          <h3>Productos</h3>
          <Boton secundario onClick={csv}>
            Descargar reporte CSV
          </Boton>
        </div>
        <div className="dos-columnas">
          <Campo label="Ordenar productos">
            <select value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option value="ventas">Mayor importe vendido</option>
              <option value="margen">Mayor margen bruto</option>
              <option value="mas">Más cantidad vendida</option>
              <option value="menos">Menos cantidad vendida</option>
            </select>
          </Campo>
          <Campo label="Comparar unidad de medida">
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="unidad">Unidades</option>
              <option value="kg">Kilogramos</option>
              <option value="litro">Litros</option>
            </select>
          </Campo>
        </div>
        {["mas", "menos"].includes(orden) && unidad === "todas" && (
          <p className="aviso">
            Selecciona una unidad de medida para comparar cantidades
            equivalentes.
          </p>
        )}
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Vendido</th>
                <th>Ventas</th>
                <th>Margen</th>
                <th>Merma</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.nombre}
                    {!p.stockQ && <small>Sin existencias actuales</small>}
                  </td>
                  <td>
                    {cantidadTexto(p.vendidoQ)} {p.unidad}
                  </td>
                  <td>{dinero(p.ventasCents)}</td>
                  <td>{dinero(p.margenCents)}</td>
                  <td>{dinero(p.mermaCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Un producto sin ventas puede haber estado agotado. La clasificación no
          mide por sí sola su demanda.
        </p>
      </section>
      <section>
        <h3>Historial diario</h3>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Ventas netas</th>
                <th>Merma</th>
                <th>Gastos</th>
                <th>Resultado registrado</th>
              </tr>
            </thead>
            <tbody>
              {r.diario.map((d) => (
                <tr key={d.dia}>
                  <td>{d.dia}</td>
                  <td>{dinero(d.ventasCents)}</td>
                  <td>{dinero(d.mermaCents)}</td>
                  <td>{dinero(d.gastosCents)}</td>
                  <td>{dinero(d.resultadoCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3>Mermas del periodo</h3>
        {s.mermas
          .filter((m) => {
            const d = diaEcuador(m.fecha);
            return d >= r.inicio && d <= r.fin;
          })
          .slice()
          .reverse()
          .map((m) => (
            <div className="fila" key={m.id}>
              <div>
                <strong>{m.nombre}</strong>
                <p>
                  {cantidadTexto(m.cantidadQ)} {m.unidad} · {m.motivo}
                  {m.historica ? " · registro histórico, valor estimado" : ""}
                </p>
                <Fecha valor={m.fecha} />
              </div>
              <div>
                <strong>{dinero(m.costoCents)}</strong>
                {m.productoId &&
                  !m.historica &&
                  !m.anuladaPor &&
                  m.cantidadQ > 0 && (
                    <Boton
                      peligro
                      disabled={ocupado}
                      onClick={() => {
                        const motivo = prompt(
                          "Motivo de anulación: confirma que los productos regresan físicamente al stock.",
                        );
                        if (motivo)
                          actuar("anularMerma", { mermaId: m.id, motivo });
                      }}
                    >
                      Anular merma
                    </Boton>
                  )}
              </div>
            </div>
          ))}
      </section>
      <section>
        <h3>Ventas y devoluciones del periodo</h3>
        {s.ventas
          .filter((v) => {
            const d = diaEcuador(v.fecha);
            return d >= r.inicio && d <= r.fin;
          })
          .slice()
          .reverse()
          .map((v) => (
            <div className="item" key={v.id}>
              <div className="titulo-fila">
                <strong>
                  {v.tipo === "venta" ? "Venta" : "Devolución"} ·{" "}
                  {dinero(v.totalCents)}
                </strong>
                <Fecha valor={v.fecha} />
              </div>
              {v.lineas.map((l) => (
                <p key={l.productoId}>
                  {l.nombre}: {cantidadTexto(l.cantidadQ)} {l.unidad} ·{" "}
                  {dinero(l.totalCents)}
                </p>
              ))}
              {v.tipo === "venta" && !v.anuladaPor && (
                <Boton
                  peligro
                  disabled={ocupado}
                  onClick={() => {
                    const motivo = prompt(
                      "Anula la venta completa, devuelve todos los productos al stock y registra reembolso de los cobros. Motivo:",
                    );
                    if (motivo)
                      actuar("anularVenta", { ventaId: v.id, motivo });
                  }}
                >
                  Anular venta completa
                </Boton>
              )}
              {v.anuladaPor && (
                <p>
                  Venta anulada; su devolución aparece en la fecha en que se
                  registró.
                </p>
              )}
            </div>
          ))}
      </section>
    </>
  );
}
