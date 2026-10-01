import { cantidad } from "./negocio.js";
import { centavos } from "./datos.js";

export const nombreUnidad = (unidad) =>
  ({ unidad: "unidad", kg: "kilogramo", litro: "litro" })[unidad];

export function calcularCompra({ unidad, envases, contenido, total }) {
  if (!["unidad", "kg", "litro"].includes(unidad))
    throw new Error("Elige cómo vendes el producto.");
  const n = cantidad(envases, "unidad") / 1000;
  const contenidoQ = cantidad(contenido, unidad);
  const stockQ = n * contenidoQ;
  if (!n || !contenidoQ)
    throw new Error(
      "Indica cuántos envases compraste y cuánto contiene cada uno.",
    );
  if (!Number.isSafeInteger(stockQ) || stockQ > 99999999999)
    throw new Error("La cantidad de esta compra es demasiado grande.");
  const valorCents = centavos(total);
  const costoCents = Math.round((valorCents * 1000) / stockQ);
  if (!Number.isSafeInteger(costoCents) || costoCents > 99999999999)
    throw new Error("Revisa el costo y la cantidad de la compra.");
  return { stockQ, valorCents, costoCents };
}
