import { descargar } from "./descargar.js";

export async function compartirRespaldo(nombre, datos) {
  const archivo = new File([JSON.stringify(datos, null, 2)], nombre, {
    type: "application/json",
  });
  if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: "Respaldo de mi tienda Aliado",
      });
      return "Terminó la acción de compartir. Comprueba en el chat elegido que el archivo llegó; Aliado no puede confirmar su entrega.";
    } catch (error) {
      if (error.name === "AbortError")
        return "No se compartió el respaldo. Puedes intentarlo cuando quieras.";
      // Si el sistema no puede compartir JSON, ofrecer el archivo completo.
    }
  }
  descargar(nombre, datos);
  return "Iniciamos la descarga del respaldo. Abre WhatsApp, elige tu chat personal u otro chat y adjunta el archivo .json como documento.";
}
