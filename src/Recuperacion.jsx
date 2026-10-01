import { Component } from "react";
import { CLAVES } from "./datos.js";
import { abrirBase, leerOriginales } from "./almacen.js";

export default class Recuperacion extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  descargarOriginales = async () => {
    let base;
    try {
      base = await abrirBase();
      const documento = await leerOriginales(base);
      const datos = Object.fromEntries(
        CLAVES.map((k) => [k, localStorage.getItem(k)]),
      );
      const blob = new Blob(
        [
          JSON.stringify(
            { tipo: "recuperacion-originales", documento, datos },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `aliado-recuperacion-${Date.now()}.json`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert(
        "No fue posible leer los datos originales. Solicita soporte antes de borrar datos del navegador.",
      );
    } finally {
      base?.close();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <h1 className="text-xl font-bold mb-4">
          Revisa tus datos antes de continuar
        </h1>
        <p className="mb-4">
          No se pudo cargar Aliado. Los datos guardados no se han reemplazado.
          Conserva una copia y solicita soporte; no borres los datos del
          navegador.
        </p>
        <p className="mb-4 text-sm">{this.state.error.message}</p>
        <button
          className="bg-blue-600 text-white rounded-lg p-3"
          onClick={this.descargarOriginales}
        >
          Descargar originales para recuperación
        </button>
        <p className="mt-4 text-sm">
          Esta copia puede contener datos personales. No es un respaldo para
          importar directamente; compártela únicamente con soporte autorizado.
        </p>
      </main>
    );
  }
}
