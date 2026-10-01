import test from 'node:test'
import assert from 'node:assert/strict'
import { centavos, importe, unidades, sumarImportes, deuda, validarFiado, diaEcuador, mermasDelMes, validarRespaldo, restaurarDatos, estimarCierre } from '../src/datos.js'

const fecha = '2026-10-01T00:00:00.000Z'
const respaldo = () => ({ version: 1, fecha, tienda: { nombreTienda: 'Prueba', nombreDueno: 'Dueño', telefono: '' }, fiados: [{ id: 1, nombre: 'Cliente', telefono: '', monto: 10, fecha, abonos: [{ monto: 2, fecha }], recordatorios: [] }], mermas: [], cierres: [], productos: [] })

test('centavos exactos y liquidación de deuda con decimales', () => {
  assert.equal(sumarImportes([0.1, 0.2]), 0.3)
  assert.equal(deuda({ monto: 0.3, abonos: [{ monto: 0.1 }, { monto: 0.2 }] }), 0)
  assert.equal(importe('12.30'), 12.3)
  assert.equal(centavos(19.99), 1999)
})

test('rechaza importes negativos, no finitos, vacíos o de más de dos decimales', () => {
  for (const v of [-1, NaN, Infinity, null, true, {}, '', '0.001', 0.001, '2abc']) assert.throws(() => centavos(v))
  assert.equal(importe('', true), 0)
})

test('cantidad entera y no negativa', () => {
  for (const v of [-1, '1.5', 1.5, NaN, '', Infinity]) assert.throws(() => unidades(v))
  assert.equal(unidades('12'), 12)
})

test('crear/editar un abono o reducir fiado no puede dejar sobrepago', () => {
  assert.throws(() => validarFiado({ monto: 10, abonos: [{ monto: 15 }] }))
  assert.throws(() => validarFiado({ monto: 5, abonos: [{ monto: 4 }, { monto: 2 }] }))
  assert.throws(() => validarFiado({ monto: 10, abonos: [{ monto: 0 }] }))
  assert.doesNotThrow(() => validarFiado({ monto: 0.3, abonos: [{ monto: 0.1 }, { monto: 0.2 }] }))
})

test('mes y día siguen Ecuador aunque servidor use UTC', () => {
  assert.equal(diaEcuador('2026-10-01T00:00:00Z'), '2026-09-30')
  const m = [{ fecha: '2026-09-01T04:00:00Z', valor: 100 }, { fecha: '2026-09-01T05:00:00Z', valor: 2 }, { fecha: '2026-10-01T04:59:00Z', valor: 3 }, { fecha: '2026-10-01T05:00:00Z', valor: 100 }]
  assert.equal(sumarImportes(mermasDelMes(m, '2026-09-20T12:00:00Z').map(x => x.valor)), 5)
})

test('cierre estima caja/fiados sin inventar utilidad', () => {
  const r = estimarCierre({ efectivoFinal: 100.3, efectivoInicial: 20.1, retiro: 10.2, fiadoDadoHoy: 15.2, fiadoCobradoHoy: 5.3 })
  assert.equal(r.ventasEfectivo, 90.4)
  assert.equal(r.ventasTotales, 100.3)
  assert.equal(r.gananciaEstimada, null)
})

test('respaldo completo compatible y rechazo de esquema/duplicados/sobrepagos', () => {
  assert.doesNotThrow(() => validarRespaldo(respaldo()))
  const casos = []
  const incompleto = respaldo(); delete incompleto.productos; casos.push(incompleto)
  casos.push({ ...respaldo(), version: 3 }, { ...respaldo(), fiados: {} })
  const duplicado = respaldo(); duplicado.fiados.push({ ...duplicado.fiados[0] }); casos.push(duplicado)
  const sobrepago = respaldo(); sobrepago.fiados[0].abonos[0].monto = 20; casos.push(sobrepago)
  for (const x of casos) assert.throws(() => validarRespaldo(x))
})

function storagePrueba(fallaEn) {
  const map = new Map([['tienda', 'original'], ['fiados', 'deudas originales']])
  let fallado = false
  return { map, getItem: k => map.get(k) ?? null, removeItem: k => map.delete(k), setItem(k, v) { if (k === fallaEn && !fallado) { fallado = true; throw new Error('quota') } map.set(k, v) } }
}

test('respaldo inválido no toca ningún registro', () => {
  const st = storagePrueba(); const before = [...st.map]
  assert.throws(() => restaurarDatos(st, { version: 1 }))
  assert.deepEqual([...st.map], before)
})

test('fallo de escritura revierte los cambios anteriores', () => {
  const st = storagePrueba('cierres'); const before = [...st.map]
  assert.throws(() => restaurarDatos(st, respaldo()), /conservaron/)
  assert.deepEqual([...st.map], before)
})

test('restauración completa sustituye incluso colecciones vacías', () => {
  const st = storagePrueba(); restaurarDatos(st, respaldo())
  assert.deepEqual(JSON.parse(st.getItem('productos')), [])
  assert.equal(JSON.parse(st.getItem('fiados'))[0].monto, 10)
})
