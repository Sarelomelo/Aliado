import { useState } from "react";
import { dinero, saldoDeuda } from "../negocio.js";
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

export default function Clientes({ estado: s, actuar, ocupado }) {
  const [nombre, setNombre] = useState(""),
    [tel, setTel] = useState(""),
    [deudaId, setDeudaId] = useState(""),
    [monto, setMonto] = useState(""),
    [metodo, setMetodo] = useState("efectivo"),
    [clienteId, setClienteId] = useState(""),
    [saldo, setSaldo] = useState("");
  const d = s.deudas.find((d) => d.id === deudaId),
    c = d && s.clientes.find((c) => c.id === d.clienteId);
  function whatsapp() {
    let telefono = c.telefono.replace(/\D/g, "");
    if (telefono.startsWith("0")) telefono = `593${telefono.slice(1)}`;
    else if (telefono && !telefono.startsWith("593"))
      telefono = `593${telefono}`;
    const mensaje = `Hola ${c.nombre}, le saluda ${s.tienda.nombreTienda}. Su saldo pendiente es ${dinero(saldoDeuda(d))}. Gracias.`;
    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  return (
    <>
      <h2>Fiados y clientes</h2>
      <div className="indicadores">
        <Tarjeta
          label="Saldo pendiente actual"
          valor={dinero(s.deudas.reduce((a, d) => a + saldoDeuda(d), 0))}
        />
      </div>
      <details>
        <summary>Registrar cliente</summary>
        <Formulario
          className="formulario"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await actuar("cliente", { nombre, telefono: tel })) {
              setNombre("");
              setTel("");
            }
          }}
        >
          <Campo
            label="Nombre del cliente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <Campo
            label="Celular del cliente (opcional)"
            value={tel}
            type="tel"
            onChange={(e) => setTel(e.target.value)}
          />
          <Boton disabled={ocupado}>Guardar cliente</Boton>
        </Formulario>
      </details>
      <details>
        <summary>Registrar una deuda anterior a Aliado</summary>
        <Formulario
          className="formulario"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await actuar("deudaInicial", {
                clienteId,
                montoCents: centavos(saldo),
              })
            )
              setSaldo("");
          }}
        >
          <Campo label="Cliente del saldo previo">
            <select
              required
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {s.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {c.telefono || c.id.slice(-6)}
                </option>
              ))}
            </select>
          </Campo>
          <Importe
            label="Saldo previo"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            required
          />
          <p>
            Registra una deuda existente; no crea una venta ni descuenta
            inventario.
          </p>
          <Boton disabled={ocupado}>Registrar saldo previo</Boton>
        </Formulario>
      </details>
      <div className="lista">
        {s.deudas
          .slice()
          .reverse()
          .map((d) => {
            const c = s.clientes.find((c) => c.id === d.clienteId);
            return (
              <button
                className="item deuda"
                key={d.id}
                onClick={() => {
                  setDeudaId(d.id);
                  setMonto("");
                }}
              >
                <strong>{c.nombre}</strong>
                <span>{dinero(saldoDeuda(d))}</span>
                <small>
                  {d.origen} · {diaEcuador(d.fecha)}
                  {d.anuladaPor ? " · venta anulada" : ""}
                </small>
              </button>
            );
          })}
      </div>
      {d && (
        <section>
          <h3>{c.nombre} · detalle de deuda</h3>
          <p>
            Monto fiado: {dinero(d.montoCents)} · pendiente:{" "}
            {dinero(saldoDeuda(d))}
          </p>
          {!d.ventaId && (
            <Boton
              secundario
              disabled={ocupado}
              onClick={async () => {
                const valor = prompt(
                  "Monto TOTAL corregido (incluye lo ya abonado):",
                  String(d.montoCents / 100),
                );
                if (valor === null) return;
                const motivo = prompt("Motivo de la corrección:");
                if (motivo)
                  await actuar("corregirDeudaInicial", {
                    deudaId: d.id,
                    montoCents: centavos(valor),
                    motivo,
                  });
              }}
            >
              Corregir saldo previo
            </Boton>
          )}
          {d.ajustes?.map((a) => (
            <p key={a.id}>
              Corrección: {dinero(a.anteriorCents)} a {dinero(a.nuevoCents)} ·{" "}
              {a.motivo}
            </p>
          ))}
          {d.ventaId && (
            <p>
              Venta vinculada. La salida de productos se registró una sola vez.
            </p>
          )}
          <div className="lista">
            {d.abonos.map((a) => (
              <div key={a.id} className="fila">
                <div>
                  {dinero(a.montoCents)} · {a.metodo}
                  {a.anuladaPor ? " · anulado" : ""}
                  <p>
                    <Fecha valor={a.fecha} />
                  </p>
                </div>
                {!a.inicial && !a.anuladaPor && !d.anuladaPor && (
                  <Boton
                    peligro
                    disabled={ocupado}
                    onClick={() => {
                      const motivo = prompt(
                        "Motivo de la anulación del abono (registra devolución del dinero):",
                      );
                      if (motivo)
                        actuar("anularAbono", {
                          deudaId: d.id,
                          abonoId: a.id,
                          motivo,
                        });
                    }}
                  >
                    Anular abono
                  </Boton>
                )}
              </div>
            ))}
          </div>
          {saldoDeuda(d) > 0 && (
            <>
              <Formulario
                className="formulario"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await actuar("abono", {
                      deudaId: d.id,
                      montoCents: centavos(monto),
                      metodo,
                    })
                  )
                    setMonto("");
                }}
              >
                <Importe
                  label="Importe del abono"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
                <Metodo valor={metodo} cambiar={setMetodo} />
                <Boton disabled={ocupado}>Registrar abono</Boton>
              </Formulario>
              <Boton secundario onClick={whatsapp}>
                Preparar recordatorio de WhatsApp
              </Boton>
              <p>
                WhatsApp requiere confirmar el envío; Aliado no verifica la
                entrega.
              </p>
            </>
          )}
        </section>
      )}
      <section>
        <h3>Clientes registrados</h3>
        {s.clientes.map((c) => (
          <div className="fila" key={c.id}>
            <p>
              {c.nombre} · {c.telefono || "Sin celular"} · referencia{" "}
              {c.id.slice(-6)}
              {c.importado ? " · importado, confirmar identidad" : ""}
            </p>
            <Boton
              secundario
              disabled={ocupado}
              onClick={() => {
                const nombre = prompt("Nombre del cliente:", c.nombre);
                if (!nombre) return;
                const telefono = prompt("Celular:", c.telefono);
                if (telefono !== null)
                  actuar("editarCliente", {
                    clienteId: c.id,
                    nombre,
                    telefono,
                  });
              }}
            >
              Editar cliente
            </Boton>
          </div>
        ))}
      </section>
    </>
  );
}
