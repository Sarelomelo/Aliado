import { test, expect } from "@playwright/test";

async function datos(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("aliado-negocio-v3", 1);
        req.onsuccess = () => {
          const db = req.result,
            get = db
              .transaction("documentos")
              .objectStore("documentos")
              .get("principal");
          get.onsuccess = () => {
            resolve(get.result);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
        req.onerror = () => reject(req.error);
      }),
  );
}
async function ir(page, nombre) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: nombre, exact: true })
    .click();
}
async function configurar(page) {
  await page.goto("/");
  await page
    .getByLabel("Nombre de la tienda", { exact: true })
    .fill("Tienda de prueba");
  await page
    .getByLabel("Nombre del propietario", { exact: true })
    .fill("Tendero ficticio");
  await page
    .getByRole("button", { name: "Configurar mi tienda", exact: true })
    .click();
  await expect(page.getByRole("navigation")).toBeVisible();
}
async function producto(page) {
  await ir(page, "Inventario");
  await page
    .getByRole("button", { name: "Nuevo producto", exact: true })
    .click();
  await page.getByLabel("Nombre del producto", { exact: true }).fill("Leche");
  await page.getByLabel("Precio de venta por unidad de medida").fill("1");
  await page.getByLabel("Stock mínimo", { exact: true }).fill("2");
  await page.getByLabel("Stock inicial", { exact: true }).fill("3");
  await page.getByLabel("Costo de compra por unidad de medida").fill("0.70");
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Leche", exact: true }),
  ).toBeVisible();
}

test("tienda real local: venta, alerta, merma, reposición, cierre y respaldo", async ({
  page,
}) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await configurar(page);
  await producto(page);
  await ir(page, "Caja");
  await page.getByLabel("Efectivo al abrir hoy").fill("20");
  await page.getByRole("button", { name: "Registrar fondo inicial" }).click();
  await ir(page, "Vender");
  await page.getByRole("button", { name: /^Leche/ }).click();
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  await expect(
    page.getByText("El carrito está vacío.", { exact: true }),
  ).toBeVisible();
  let s = await datos(page);
  expect(s.productos[0].stockQ).toBe(2000);
  expect(s.ventas[0].totalCents).toBe(100);
  await ir(page, "Inicio");
  await expect(
    page.getByText("Quedan 2 unidad. Mínimo: 2.", { exact: true }),
  ).toBeVisible();
  await ir(page, "Inventario");
  await page.getByRole("button", { name: "Merma", exact: true }).click();
  await page.getByLabel("Cantidad (unidad)").fill("1");
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  s = await datos(page);
  expect(s.productos[0].stockQ).toBe(1000);
  expect(s.mermas[0].costoCents).toBe(70);
  await page.getByRole("button", { name: "Reponer", exact: true }).click();
  await page.getByLabel("Cantidad (unidad)").fill("5");
  await page.getByLabel("Costo TOTAL de la compra").fill("4");
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  s = await datos(page);
  expect(s.productos[0].stockQ).toBe(6000);
  expect(s.productos[0].valorCents).toBe(470);
  await ir(page, "Caja");
  await page.getByLabel("Efectivo contado al cerrar").fill("17");
  await page
    .getByRole("button", { name: "Guardar cierre", exact: true })
    .click();
  s = await datos(page);
  expect(s.cierres[0].esperadoCents).toBe(1700);
  expect(s.cierres[0].diferenciaCents).toBe(0);
  await ir(page, "Reportes");
  await expect(page.getByText("$0,70", { exact: true }).first()).toBeVisible();
  await ir(page, "Configuración");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar respaldo completo" }).click(),
  ]);
  expect(download.suggestedFilename()).toContain("aliado-respaldo-");
  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  expect((await datos(page)).productos[0].stockQ).toBe(6000);
  expect(errores).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("práctica interactiva no modifica la tienda real", async ({ page }) => {
  await configurar(page);
  const antes = await datos(page);
  await page.getByRole("button", { name: "Probar tienda ficticia" }).click();
  await expect(
    page.getByText("Modo práctica · datos ficticios", { exact: true }),
  ).toBeVisible();
  await ir(page, "Vender");
  await page.getByRole("button", { name: /^Leche 1 L/ }).click();
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  await expect(
    page.getByText("El carrito está vacío.", { exact: true }),
  ).toBeVisible();
  expect(await datos(page)).toEqual(antes);
  await page.getByRole("button", { name: "Salir de práctica" }).click();
  await expect(
    page.getByText("Tienda de prueba", { exact: true }),
  ).toBeVisible();
  expect(await datos(page)).toEqual(antes);
});

test("venta fiada, rechazo de sobrepago, cobro y anulación con devolución", async ({
  page,
}) => {
  await configurar(page);
  await producto(page);
  await ir(page, "Fiados");
  await page.getByText("Registrar cliente", { exact: true }).click();
  await page.getByLabel("Nombre del cliente", { exact: true }).fill("Rosa");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await ir(page, "Vender");
  await page.getByRole("button", { name: /^Leche/ }).click();
  await page.getByLabel("Cantidad de Leche").fill("2");
  await page.getByLabel("Forma de pago", { exact: true }).selectOption("fiado");
  const s0 = await datos(page);
  await page.getByLabel("Cliente del fiado").selectOption(s0.clientes[0].id);
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  await expect(
    page.getByText("El carrito está vacío.", { exact: true }),
  ).toBeVisible();
  await ir(page, "Fiados");
  await page.getByRole("button", { name: /^Rosa/ }).click();
  await page.getByLabel("Importe del abono").fill("3");
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await expect(page.getByRole("alert")).toContainText("no superar el saldo");
  expect((await datos(page)).deudas[0].abonos).toHaveLength(0);
  await page.getByLabel("Importe del abono").fill("1");
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await expect(page.getByRole("status")).toContainText("guardada");
  expect((await datos(page)).deudas[0].abonos[0].montoCents).toBe(100);
  await ir(page, "Reportes");
  page.once("dialog", (d) => d.accept("Devolución completa"));
  await page.getByRole("button", { name: "Anular venta completa" }).click();
  await expect(
    page.getByText(
      "Venta anulada; su devolución aparece en la fecha en que se registró.",
    ),
  ).toBeVisible();
  const s = await datos(page);
  expect(s.productos[0].stockQ).toBe(3000);
  expect(s.ventas).toHaveLength(2);
  expect(s.deudas[0].anuladaPor).toBeTruthy();
});

test("stock insuficiente mantiene carrito y datos originales", async ({
  page,
}) => {
  await configurar(page);
  await producto(page);
  await ir(page, "Vender");
  await page.getByRole("button", { name: /^Leche/ }).click();
  await page.getByLabel("Cantidad de Leche").fill("4");
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByRole("alert")).toContainText("Stock insuficiente");
  const s = await datos(page);
  expect(s.ventas).toHaveLength(0);
  expect(s.productos[0].stockQ).toBe(3000);
  await expect(page.getByLabel("Cantidad de Leche")).toHaveValue("4");
});

test("migración de versión anterior conserva stock, fiado y originales", async ({
  page,
}) => {
  const fecha = new Date().toISOString();
  const legacy = {
    tienda: {
      nombreTienda: "Tienda anterior",
      nombreDueno: "Dueño",
      telefono: "",
    },
    productos: [
      {
        id: 1,
        fecha,
        nombre: "Leche antigua",
        precioCompra: 0.7,
        precioVenta: 1,
        stock: 10,
        stockMinimo: 2,
      },
    ],
    fiados: [
      {
        id: 1,
        fecha,
        nombre: "Rosa",
        telefono: "",
        monto: 3,
        abonos: [{ monto: 1, fecha }],
        recordatorios: [],
      },
    ],
    mermas: [
      {
        id: 1,
        fecha,
        producto: "Leche antigua",
        cantidad: 1,
        motivo: "vencido",
        valor: 0.7,
      },
    ],
    cierres: [],
  };
  await page.addInitScript((datos) => {
    for (const [k, v] of Object.entries(datos))
      localStorage.setItem(k, JSON.stringify(v));
  }, legacy);
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  const s = await datos(page);
  expect(s.productos[0].stockQ).toBe(10000);
  expect(s.ventas).toHaveLength(0);
  expect(s.deudas[0].montoCents).toBe(300);
  expect(s.deudas[0].abonos[0].montoCents).toBe(100);
  expect(s.legado.mermas).toEqual(legacy.mermas);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("productos"))),
  ).toEqual(legacy.productos);
});

test("respaldo inconsistente se rechaza sin reemplazar los datos", async ({
  page,
}) => {
  await configurar(page);
  await producto(page);
  const antes = await datos(page);
  const malo = structuredClone(antes);
  malo.productos[0].stockQ += 1000;
  await ir(page, "Configuración");
  await page.locator('input[type="file"]').setInputFiles({
    name: "incorrecto.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 3,
        fecha: new Date().toISOString(),
        estado: malo,
      }),
    ),
  });
  await expect(page.getByRole("alert")).toContainText(
    "historial de movimientos",
  );
  expect(await datos(page)).toEqual(antes);
});

test("práctica muestra reportes por fechas y cabe en móvil y escritorio", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Probar tienda ficticia" }).click();
  await ir(page, "Reportes");
  await page.getByLabel("Periodo del reporte").selectOption("personalizado");
  await expect(page.getByLabel("Desde", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Hasta", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Resultado operativo registrado", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/aliado-reportes.png", fullPage: true });
});

test("versión instalable conserva ventas al trabajar sin conexión", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.ALIADO_TEST_PRODUCCION,
    "El service worker se comprueba en la compilación de producción.",
  );
  await configurar(page);
  await producto(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await ir(page, "Vender");
  await page.getByRole("button", { name: /^Leche/ }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(
    page.getByText("El carrito está vacío.", { exact: true }),
  ).toBeVisible();
  expect((await datos(page)).productos[0].stockQ).toBe(2000);
  await context.setOffline(false);
});

test("carrito se conserva al registrar un cliente y regresar a vender", async ({
  page,
}) => {
  await configurar(page);
  await producto(page);
  await ir(page, "Vender");
  await page.getByRole("button", { name: /^Leche/ }).click();
  await page.getByLabel("Cantidad de Leche").fill("2");
  await ir(page, "Fiados");
  await page.getByText("Registrar cliente", { exact: true }).click();
  await page
    .getByLabel("Nombre del cliente", { exact: true })
    .fill("Nuevo cliente");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await ir(page, "Vender");
  await expect(page.getByLabel("Cantidad de Leche")).toHaveValue("2");
});

test("datos corruptos quedan protegidos y se pueden exportar para recuperación", async ({
  page,
}) => {
  await configurar(page);
  await producto(page);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("aliado-negocio-v3", 1);
        req.onsuccess = () => {
          const db = req.result,
            tx = db.transaction("documentos", "readwrite"),
            store = tx.objectStore("documentos"),
            get = store.get("principal");
          get.onsuccess = () => {
            const s = get.result;
            s.productos[0].stockQ = -1000;
            store.put(s, "principal");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await expect(
    page.getByText("No se pudieron cargar los datos", { exact: true }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Descargar originales para recuperación" })
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    "aliado-recuperacion-originales.json",
  );
  expect((await datos(page)).productos[0].stockQ).toBe(-1000);
});
