export async function compartirRespaldo(nombre, datos) {
  // .txt es un documento compartible en más navegadores que .json.
  // El contenido sigue siendo el respaldo JSON completo y validado al importar.
  const archivo = new File(
    [JSON.stringify(datos, null, 2)],
    nombre.replace(/\.json$/, ".txt"),
    {
      type: "text/plain",
    },
  );
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
      return "No pudimos abrir las opciones para compartir. Intenta abrir Aliado en Chrome o Safari desde tu teléfono y vuelve a pulsar el botón. No se descargó ni envió ningún respaldo.";
    }
  }
  return "Este navegador no permite compartir archivos. Abre Aliado en Chrome o Safari desde tu teléfono y vuelve a intentarlo. La descarga sigue disponible en Descargar respaldo completo.";
}
