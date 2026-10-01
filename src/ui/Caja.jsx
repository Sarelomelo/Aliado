import { useState } from "react";
import { dinero } from "../negocio.js";
import { centavos, diaEcuador } from "../datos.js";
import {
  Boton,
  Campo,
  Formulario,
  Importe,
  Metodo,
  Tarjeta,
  Fecha,
} from "./comun.jsx";
import { nombresMovimiento } from "./nombres.js";

export default function Caja({ estado: s, actuar, ocupado }) {
  const [fondo, setFondo] = useState(""),
    [contado, setContado] = useState(""),
    [tipo, setTipo] = useState("gasto"),
    [concepto, setConcepto] = useState(""),
    [monto, setMonto] = useState(""),
    [metodo, setMetodo] = useState("efectivo");
  const hoy = diaEcuador(),
    movs = s.movimientos.filter((m) => diaEcuador(m.fecha) === hoy),
    apertura = movs.find((m) => m.tipo === "apertura"),
    abierto = !!apertura,
    esperado = movs.reduce((sum, m) => sum + m.cashCents, 0);
  return (
    <>
      <h2>Caja y gastos</h2>
      <p>
        El dinero inicial es lo que tenías al empezar. El dinero que debería
        haber ahora cambia con los cobros y pagos en efectivo que registras.
        Los fiados sin cobrar y las transferencias no suman dinero en caja.
      </p>
      {!abierto ? (
        <Formulario
          className="formulario"
          onSubmit={(e) => {
            e.preventDefault();
            actuar("abrirCaja", { fondoCents: centavos(fondo) });
          }}
        >
          <Importe
            label="Dinero que tienes en caja al empezar el día"
            value={fondo}
            onChange={(e) => setFondo(e.target.value)}
            required
          />
          <Boton disabled={ocupado}>Registrar fondo inicial</Boton>
        </Formulario>
      ) : (
        <div className="indicadores">
          <Tarjeta
            label="Dinero que tienes en caja al empezar el día"
            valor={dinero(apertura.cashCents)}
            detalle="Este monto inicial no cambia con las ventas del día."
          />
          <Tarjeta
            label="Dinero que debería haber en caja ahora"
            valor={dinero(esperado)}
            detalle="Calculado con el dinero inicial y los movimientos registrados; compruébalo contando tu caja."
          />
          <Tarjeta
            label="Movimiento neto en transferencias hoy"
            valor={dinero(movs.reduce((sum, m) => sum + m.transferCents, 0))}
          />
        </div>
      )}
      <section>
        <h3>Registrar movimiento</h3>
        <Formulario
          className="formulario"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await actuar(tipo, {
                concepto,
                montoCents: centavos(monto),
                metodo,
              })
            ) {
              setMonto("");
              setConcepto("");
            }
          }}
        >
          <Campo label="Tipo de movimiento">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="gasto">Gasto operativo</option>
              <option value="aporte">Aporte del propietario</option>
              <option value="retiro">Retiro personal</option>
            </select>
          </Campo>
          <Campo
            label="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            required
          />
          <Importe
            label="Importe del movimiento"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
          <Metodo valor={metodo} cambiar={setMetodo} />
          <p>
            La mercadería se registra en Reponer inventario. Aportes y retiros
            no son ventas ni gastos operativos.
          </p>
          <Boton disabled={ocupado}>Guardar movimiento de caja</Boton>
        </Formulario>
      </section>
      {abierto && (
        <section>
          <h3>Cerrar el día</h3>
          <Formulario
            className="formulario"
            onSubmit={(e) => {
              e.preventDefault();
              actuar("cerrarCaja", { contadoCents: centavos(contado) });
            }}
          >
            <Importe
              label="Efectivo contado al cerrar"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              required
            />
            <Boton disabled={ocupado}>Guardar cierre</Boton>
          </Formulario>
          <p>
            Una diferencia no cambia las ventas: queda registrada para revisar
            faltantes o sobrantes.
          </p>
        </section>
      )}
      <section>
        <h3>Últimos cierres</h3>
        {s.cierres
          .slice(-10)
          .reverse()
          .map((c) => (
            <div className="fila" key={c.id}>
              <div>
                <Fecha valor={c.fecha} />
                <p>
                  Esperado {dinero(c.esperadoCents)} · contado{" "}
                  {dinero(c.contadoCents)}
                </p>
              </div>
              <strong className={c.diferenciaCents ? "texto-naranja" : ""}>
                Diferencia {dinero(c.diferenciaCents)}
              </strong>
            </div>
          ))}
      </section>
      <section>
        <h3>Movimientos de hoy</h3>
        {movs
          .slice()
          .reverse()
          .map((m) => (
            <div className="fila" key={m.id}>
              <div>
                {nombresMovimiento[m.tipo] || m.tipo}
                {m.concepto && ` · ${m.concepto}`}
                <p>
                  <Fecha valor={m.fecha} />
                </p>
              </div>
              <span>
                Efectivo {dinero(m.cashCents)}
                <br />
                Transferencia {dinero(m.transferCents)}
                {m.tipo === "gasto" && m.montoCents > 0 && !m.anuladaPor && (
                  <Boton
                    peligro
                    disabled={ocupado}
                    onClick={() => {
                      const motivo = prompt(
                        "Motivo de anulación: registra también la devolución del pago.",
                      );
                      if (motivo)
                        actuar("anularGasto", { movimientoId: m.id, motivo });
                    }}
                  >
                    Anular gasto
                  </Boton>
                )}
              </span>
            </div>
          ))}
      </section>
    </>
  );
}
