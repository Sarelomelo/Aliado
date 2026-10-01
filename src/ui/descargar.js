export function descargar(nombre, datos) {
  const blob = new Blob(
    [typeof datos === "string" ? datos : JSON.stringify(datos, null, 2)],
    {
      type:
        typeof datos === "string"
          ? "text/csv;charset=utf-8"
          : "application/json",
    },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
