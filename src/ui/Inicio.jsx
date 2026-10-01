import { cantidadTexto, dinero, reporte } from "../negocio.js";
import { diaEcuador } from "../datos.js";
import { Boton, Tarjeta, Fecha } from "./comun.jsx";
import { nombresMovimiento } from "./nombres.js";

export default function Inicio({ estado: s, navegar }) {
  const r = reporte(s),
    mes = reporte(s, "mes"),
    bajos = s.productos.filter((p) => p.activo && p.stockQ <= p.minimoQ);
  const cierre = s.cierres.filter((c) => c.dia === diaEcuador()).at(-1);
  const pendiente =
    cierre &&
    s.auditoria.some(
      (a, i) =>
        i >= cierre.revision &&
        diaEcuador(a.fecha) === cierre.dia &&
        ![
          "cerrarCaja",
          "cliente",
          "tienda",
          "editarProducto",
          "archivarProducto",
        ].includes(a.tipo),
    );
  return (
    <>
      <div className="indicadores">
        <Tarjeta
          label="Ventas registradas hoy"
          valor={dinero(r.ventasCents)}
          detalle={`${r.cantidadVentas} ventas; devoluciones descontadas`}
        />
        <Tarjeta
          label="Fiado pendiente actual"
          valor={dinero(r.pendientesCents)}
          tono="naranja"
        />
        <Tarjeta
          label="Merma de este mes"
          valor={dinero(mes.mermaCents)}
          tono="naranja"
        />
        <Tarjeta
          label="Inventario al costo"
          valor={dinero(r.inventarioCents)}
        />
      </div>
      <section>
        <h2>Reposición</h2>
        {bajos.length ? (
          <div className="lista">
            {bajos.map((p) => (
              <div className="fila" key={p.id}>
                <div>
                  <strong>{p.nombre}</strong>
                  <p>
                    Quedan {cantidadTexto(p.stockQ)} {p.unidad}. Mínimo:{" "}
                    {cantidadTexto(p.minimoQ)}.
                  </p>
                </div>
                <Boton secundario onClick={() => navegar("inventario")}>
                  Reponer
                </Boton>
              </div>
            ))}
          </div>
        ) : (
          <p>No hay productos por debajo del mínimo configurado.</p>
        )}
      </section>
      {cierre && (
        <section>
          <h2>Cierre de hoy</h2>
          <p>
            Contado: {dinero(cierre.contadoCents)} · diferencia:{" "}
            {dinero(cierre.diferenciaCents)}
          </p>
          {pendiente && (
            <p className="aviso">
              Hay movimientos posteriores al cierre. Cuenta la caja y
              actualízalo.
            </p>
          )}
        </section>
      )}
      <section>
        <h2>Actividad reciente</h2>
        <div className="lista">
          {s.auditoria
            .slice(-5)
            .reverse()
            .map((a) => (
              <div className="fila" key={a.id}>
                <strong>{nombresMovimiento[a.tipo] || a.tipo}</strong>
                <Fecha valor={a.fecha} />
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
