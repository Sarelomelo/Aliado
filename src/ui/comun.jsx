import { cloneElement, useId, useState } from "react";
const formatoFecha = new Intl.DateTimeFormat("es-EC", {
  timeZone: "America/Guayaquil",
  dateStyle: "medium",
  timeStyle: "short",
});

export function Formulario({ onSubmit, ...props }) {
  return (
    <form
      {...props}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSubmit(e);
        } catch (error) {
          window.dispatchEvent(
            new CustomEvent("aliado-error", { detail: error.message }),
          );
        }
      }}
    />
  );
}

export function Campo({ label, children, ...props }) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      {children ? cloneElement(children, { id }) : <input id={id} {...props} />}
    </div>
  );
}

export function Boton({
  children,
  secundario = false,
  peligro = false,
  ...props
}) {
  return (
    <button
      className={`boton ${secundario ? "secundario" : ""} ${peligro ? "peligro" : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Tarjeta({ label, valor, detalle, tono = "" }) {
  return (
    <div className={`tarjeta ${tono}`}>
      <span>{label}</span>
      <strong>{valor}</strong>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}

export function Importe(props) {
  return (
    <Campo type="number" min="0" step="0.01" inputMode="decimal" {...props} />
  );
}

export function Fecha({ valor }) {
  return <time>{formatoFecha.format(new Date(valor))}</time>;
}

export function Metodo({ valor, cambiar, pendiente = false, fiado = false }) {
  return (
    <Campo label="Forma de pago">
      <select value={valor} onChange={(e) => cambiar(e.target.value)}>
        <option value="efectivo">Efectivo</option>
        <option value="transferencia">Transferencia</option>
        {pendiente && (
          <option value="pendiente">Compra pendiente de pago</option>
        )}
        {fiado && <option value="fiado">Fiado</option>}
      </select>
    </Campo>
  );
}

export function FormTienda({ tienda, actuar, ocupado }) {
  const [nombre, setNombre] = useState(tienda?.nombreTienda || ""),
    [dueno, setDueno] = useState(tienda?.nombreDueno || ""),
    [tel, setTel] = useState(tienda?.telefono || "");
  return (
    <Formulario
      onSubmit={(e) => {
        e.preventDefault();
        actuar("tienda", {
          nombreTienda: nombre,
          nombreDueno: dueno,
          telefono: tel,
        });
      }}
      className="formulario"
    >
      <Campo
        label="Nombre de tu tienda"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        maxLength={120}
      />
      <Campo
        label="Nombre del propietario"
        value={dueno}
        onChange={(e) => setDueno(e.target.value)}
        required
        maxLength={120}
      />
      <Campo
        label="Celular (opcional)"
        type="tel"
        value={tel}
        onChange={(e) => setTel(e.target.value)}
        maxLength={30}
      />
      <Boton disabled={ocupado}>
        {tienda ? "Guardar configuración" : "Crear mi tienda"}
      </Boton>
    </Formulario>
  );
}
