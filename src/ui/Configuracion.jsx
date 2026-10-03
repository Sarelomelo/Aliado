import { descargar } from "./descargar.js";
import { useRef, useState } from "react";
import { compartirRespaldo } from "./compartirRespaldo.js";
import { dinero } from "../negocio.js";
import { diaEcuador } from "../datos.js";
import {
  exportarRespaldo,
  prepararRespaldo,
  leerAntesRestaurar,
} from "../almacen.js";
import { Boton, FormTienda, Fecha } from "./comun.jsx";
import { nombresMovimiento } from "./nombres.js";

export default function Configuracion({
  estado: s,
  actuar,
  ocupado,
  restaurar,
  demo,
  obtenerBase,
}) {
  const archivo = useRef(null);
  const [compartiendo, setCompartiendo] = useState(false);
  const [avisoRespaldo, setAvisoRespaldo] = useState("");
  async function importar(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) throw new Error("El respaldo supera 20 MB.");
    const datos = JSON.parse(await f.text());
    prepararRespaldo(datos);
    if (
      !confirm(
        "¿Reemplazar los datos de esta tienda? Primero se descargará una copia de los datos actuales.",
      )
    )
      return;
    descargar(
      `aliado-antes-restaurar-${diaEcuador()}.json`,
      exportarRespaldo(s),
    );
    await restaurar(datos);
  }
  return (
    <>
      <h2>Configuración y respaldos</h2>
      <FormTienda tienda={s.tienda} actuar={actuar} ocupado={ocupado} />
      <section>
        <h3>Respaldo de tu negocio</h3>
        <p>
          Los datos permanecen en este dispositivo. Descarga respaldos
          periódicamente y antes de cambiar de equipo o dirección web.
        </p>
        <div className="acciones">
          <Boton
            secundario
            disabled={ocupado || compartiendo}
            onClick={async () => {
              setCompartiendo(true);
              setAvisoRespaldo("");
              try {
                setAvisoRespaldo(
                  await compartirRespaldo(
                    `aliado-respaldo-${diaEcuador()}.json`,
                    exportarRespaldo(s),
                  ),
                );
              } finally {
                setCompartiendo(false);
              }
            }}
          >
            Hacer respaldo en WhatsApp
          </Boton>
          <Boton
            secundario
            onClick={() =>
              descargar(
                `aliado-respaldo-${diaEcuador()}.json`,
                exportarRespaldo(s),
              )
            }
          >
            Descargar respaldo completo
          </Boton>
          <Boton
            secundario
            disabled={ocupado}
            onClick={() => archivo.current.click()}
          >
            Restaurar respaldo
          </Boton>
          {!demo && (
            <Boton
              secundario
              onClick={async () => {
                const previo = await leerAntesRestaurar(obtenerBase());
                if (!previo)
                  throw new Error(
                    "No hay una copia anterior a una restauración.",
                  );
                descargar(
                  "aliado-copia-anterior.json",
                  exportarRespaldo(previo),
                );
              }}
            >
              Descargar copia anterior
            </Boton>
          )}
        </div>
        <p className="nota">
          Pulsa el botón, elige WhatsApp y selecciona el chat donde quieras
          guardar tu respaldo. El respaldo es un archivo .txt con todos los
          datos de tu tienda. Para recuperarlos, descarga ese archivo desde el
          chat y selecciónalo en Restaurar respaldo. Compártelo solo con alguien
          de confianza.
        </p>
        {avisoRespaldo && <p role="status">{avisoRespaldo}</p>}
        <input
          ref={archivo}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          onChange={importar}
          hidden
        />
      </section>
      {s.legado && (
        <section>
          <h3>Datos importados de la versión anterior</h3>
          <p>
            Se conservan los cierres y respaldos originales. Sus estimaciones no
            se mezclan con las ventas nuevas; las mermas antiguas no vuelven a
            descontar stock. Confirma la identidad de los clientes importados.
          </p>
          <Boton
            secundario
            onClick={() => descargar("aliado-datos-originales.json", s.legado)}
          >
            Descargar datos originales
          </Boton>
          <div className="lista">
            {s.legado.cierres
              .slice()
              .reverse()
              .map((c) => (
                <div className="fila" key={c.id}>
                  <Fecha valor={c.fecha} />
                  <span>
                    Venta estimada antigua:{" "}
                    {dinero(Math.round(c.ventasTotales * 100))}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
      <section>
        <h3>Historial de operaciones</h3>
        <p>
          Las correcciones conservan los registros originales. Este historial
          local no sustituye una auditoría de servidor.
        </p>
        {s.auditoria
          .slice(-50)
          .reverse()
          .map((a) => (
            <div className="fila" key={a.id}>
              <div>
                {nombresMovimiento[a.tipo] || a.tipo}
                {a.motivo && <p>{a.motivo}</p>}
              </div>
              <Fecha valor={a.fecha} />
            </div>
          ))}
      </section>
    </>
  );
}
