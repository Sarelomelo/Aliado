import { descargar } from "./ui/descargar.js";
import { Boton, Campo, FormTienda } from "./ui/comun.jsx";
import Inicio from "./ui/Inicio.jsx";
import Venta from "./ui/Venta.jsx";
import Inventario from "./ui/Inventario.jsx";
import Clientes from "./ui/Clientes.jsx";
import Caja from "./ui/Caja.jsx";
import Reportes from "./ui/Reportes.jsx";
import Configuracion from "./ui/Configuracion.jsx";
import { useEffect, useRef, useState } from "react";
import { CLAVES } from "./datos.js";
import { aplicarOperacion } from "./negocio.js";
import {
  abrirBase,
  iniciar,
  leer,
  guardarOperacion,
  prepararRespaldo,
  restaurarBase,
  leerOriginales,
} from "./almacen.js";
import { crearSimulacion } from "./simulacion.js";
import Icono from "./ui/Icono.jsx";
import { marcasInstitucionales } from "./identidad.js";
import "./App.css";

const fechaAhora = () => new Date().toISOString();

function ImportarInicial({ restaurar }) {
  return (
    <div className="restauracion-inicial">
      <Campo label="Restaura los datos de tu tienda">
        <input
          type="file"
          accept=".json,.txt,application/json,text/plain"
          onChange={async (e) => {
            const f = e.target.files[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 20 * 1024 * 1024)
              throw new Error("El respaldo supera 20 MB.");
            const datos = JSON.parse(await f.text());
            prepararRespaldo(datos);
            if (
              confirm(
                "¿Restaurar este respaldo? Conserva primero una copia de los datos originales si hubo un error.",
              )
            )
              await restaurar(datos);
          }}
        />
      </Campo>
      <div className="ayuda-restauracion">
        <p>Si ya usabas Aliado, recupera tu información con un respaldo:</p>
        <ol>
          <li>
            Busca el archivo de respaldo de Aliado (.json o .txt) que guardaste
            en tu celular o computadora.
          </li>
          <li>Pulsa «Seleccionar archivo» y elige ese respaldo.</li>
          <li>
            Confirma la restauración para recuperar los datos de tu tienda.
          </li>
        </ol>
        <p>
          ¿Aún no tienes un respaldo? Crea tu tienda. Luego podrás guardar uno
          desde Configuración.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [real, setReal] = useState(null),
    [practica, setPractica] = useState(null),
    [pantalla, setPantalla] = useState("inicio"),
    [error, setError] = useState(""),
    [mensaje, setMensaje] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [cargando, setCargando] = useState(true),
    [carritos, setCarritos] = useState({ real: [], practica: [] });
  const base = useRef(null),
    candado = useRef(false),
    canal = useRef(null),
    practicaRef = useRef(null);
  useEffect(() => {
    let vivo = true,
      db;
    abrirBase()
      .then(async (b) => {
        db = b;
        if (!vivo) {
          b.close();
          return;
        }
        base.current = b;
        const s = await iniciar(b);
        if (vivo) {
          setReal(s);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(e.message);
          setCargando(false);
        }
      });
    async function actualizar() {
      if (base.current && !candado.current) {
        try {
          const s = await leer(base.current);
          if (vivo) setReal(s);
        } catch (e) {
          if (vivo) setError(e.message);
        }
      }
    }
    if (typeof BroadcastChannel !== "undefined") {
      canal.current = new BroadcastChannel("aliado-cambios");
      canal.current.onmessage = actualizar;
    }
    window.addEventListener("focus", actualizar);
    function capturar(e) {
      const err = e.reason || e.error;
      if (err) {
        setError(err.message || String(err));
        if (e.type === "unhandledrejection") e.preventDefault();
      }
    }
    window.addEventListener("unhandledrejection", capturar);
    const errorFormulario = (e) => setError(e.detail);
    window.addEventListener("aliado-error", errorFormulario);
    return () => {
      vivo = false;
      db?.close();
      canal.current?.close();
      window.removeEventListener("focus", actualizar);
      window.removeEventListener("unhandledrejection", capturar);
      window.removeEventListener("aliado-error", errorFormulario);
    };
  }, []);
  async function actuar(tipo, datos) {
    if (candado.current) return false;
    candado.current = true;
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      const op = {
        id: crypto.randomUUID(),
        fecha: fechaAhora(),
        tipo,
        ...datos,
      };
      if (practicaRef.current) {
        const nuevo = aplicarOperacion(practicaRef.current, op);
        practicaRef.current = nuevo;
        setPractica(nuevo);
      } else {
        const nuevo = await guardarOperacion(base.current, op);
        setReal(nuevo);
        canal.current?.postMessage("cambio");
      }
      setMensaje("Operación guardada.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      candado.current = false;
      setOcupado(false);
    }
  }
  async function restaurar(datos) {
    if (candado.current) return;
    candado.current = true;
    setOcupado(true);
    try {
      if (practicaRef.current) {
        const nuevo = prepararRespaldo(datos);
        practicaRef.current = nuevo;
        setPractica(nuevo);
      } else {
        setReal(await restaurarBase(base.current, datos));
        canal.current?.postMessage("cambio");
      }
      setCarritos({ real: [], practica: [] });
      setPantalla("inicio");
      setMensaje("Respaldo restaurado.");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      candado.current = false;
      setOcupado(false);
    }
  }
  function entrarPractica() {
    setCarritos((xs) => ({ ...xs, practica: [] }));
    const demo = crearSimulacion().estado;
    practicaRef.current = demo;
    setPractica(demo);
    setPantalla("inicio");
    setError("");
    setMensaje("");
  }
  function salirPractica() {
    practicaRef.current = null;
    setPractica(null);
    setPantalla("inicio");
    setError("");
    setMensaje("");
  }
  const s = practica || real;
  const nav = [
    ["inicio", "Inicio"],
    ["vender", "Vender"],
    ["inventario", "Inventario"],
    ["fiados", "Fiados"],
    ["caja", "Caja"],
    ["reportes", "Reportes"],
    ["config", "Configuración"],
  ];
  return (
    <div className="app">
      <header className="cabecera">
        {marcasInstitucionales.length > 0 && (
          <div
            className="marcas-institucionales"
            aria-label="Apoyo institucional"
          >
            {marcasInstitucionales.map((marca) => (
              <img key={marca.src} src={marca.src} alt={marca.alt} />
            ))}
          </div>
        )}
        <div className="marca">
          <img src="/icon-192.png" alt="" />
          <div>
            <h1>Aliado Valencia</h1>
            <p>Control total de tu negocio</p>
            {s?.tienda && (
              <span className="nombre-tienda">{s.tienda.nombreTienda}</span>
            )}
          </div>
        </div>
        {!practica && (
          <Boton secundario disabled={ocupado} onClick={entrarPractica}>
            Probar tienda ficticia
          </Boton>
        )}
      </header>
      {practica && (
        <div className="banner-practica">
          <strong>Modo práctica · datos ficticios</strong>
          <span>Los movimientos aquí no cambian tu tienda real.</span>
          <div className="acciones">
            <Boton secundario disabled={ocupado} onClick={entrarPractica}>
              Reiniciar práctica
            </Boton>
            <Boton secundario disabled={ocupado} onClick={salirPractica}>
              Salir de práctica
            </Boton>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
          <button className="enlace" onClick={() => setError("")}>
            Cerrar aviso
          </button>
        </div>
      )}
      {mensaje && (
        <div role="status" className="exito">
          {mensaje}
        </div>
      )}
      {cargando && !practica ? (
        <p>Abriendo tus datos…</p>
      ) : !s ? (
        <section>
          <h2>No se pudieron cargar los datos</h2>
          <p>
            No se han reemplazado los registros anteriores. Descarga los
            originales y solicita soporte antes de borrar datos.
          </p>
          <Boton
            secundario
            onClick={async () => {
              const original = base.current
                ? await leerOriginales(base.current)
                : null;
              descargar("aliado-recuperacion-originales.json", {
                tipo: "recuperacion-originales",
                documento: original,
                datosLocales: Object.fromEntries(
                  CLAVES.map((k) => [k, localStorage.getItem(k)]),
                ),
              });
            }}
          >
            Descargar originales para recuperación
          </Boton>
          <ImportarInicial restaurar={restaurar} />
        </section>
      ) : !s.tienda ? (
        <section>
          <h2>Crea tu tienda</h2>
          <FormTienda tienda={null} actuar={actuar} ocupado={ocupado} />
          <ImportarInicial restaurar={restaurar} />
          <p>
            Puedes probar primero con una tienda ficticia. Esta versión trabaja
            en el dispositivo; aún no envía datos al municipio.
          </p>
        </section>
      ) : (
        <>
          <nav className="navegacion-tarjetas" aria-label="Secciones">
            {nav.map(([id, nombre]) => (
              <button
                key={id}
                aria-label={nombre}
                className={pantalla === id ? "activo" : ""}
                onClick={() => {
                  setPantalla(id);
                  setMensaje("");
                  setError("");
                }}
                aria-current={pantalla === id ? "page" : undefined}
              >
                <span className="icono-seccion">
                  <Icono nombre={id} />
                </span>
                <span>{nombre}</span>
              </button>
            ))}
          </nav>
          <main key={`${pantalla}:${!!practica}`}>
            {pantalla === "inicio" && (
              <Inicio estado={s} navegar={setPantalla} />
            )}
            {pantalla === "vender" && (
              <Venta
                estado={s}
                actuar={actuar}
                ocupado={ocupado}
                carrito={carritos[practica ? "practica" : "real"]}
                setCarrito={(nuevo) =>
                  setCarritos((xs) => {
                    const modo = practica ? "practica" : "real";
                    return {
                      ...xs,
                      [modo]:
                        typeof nuevo === "function" ? nuevo(xs[modo]) : nuevo,
                    };
                  })
                }
              />
            )}
            {pantalla === "inventario" && (
              <Inventario estado={s} actuar={actuar} ocupado={ocupado} />
            )}
            {pantalla === "fiados" && (
              <Clientes estado={s} actuar={actuar} ocupado={ocupado} />
            )}
            {pantalla === "caja" && (
              <Caja estado={s} actuar={actuar} ocupado={ocupado} />
            )}
            {pantalla === "reportes" && (
              <Reportes estado={s} actuar={actuar} ocupado={ocupado} />
            )}
            {pantalla === "config" && (
              <Configuracion
                estado={s}
                actuar={actuar}
                ocupado={ocupado}
                restaurar={restaurar}
                demo={!!practica}
                obtenerBase={() => base.current}
              />
            )}
          </main>
        </>
      )}
      <footer>
        Datos locales · USD · horario de Ecuador. Mantén un respaldo de tu
        negocio.
      </footer>
    </div>
  );
}
