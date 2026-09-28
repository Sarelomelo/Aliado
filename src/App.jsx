import { useState, useEffect } from 'react'

function formatearFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function esHoy(iso) {
  const d = new Date(iso)
  const hoy = new Date()
  return d.toDateString() === hoy.toDateString()
}

function diasDesde(iso) {
  const d = new Date(iso)
  const hoy = new Date()
  d.setHours(0, 0, 0, 0)
  hoy.setHours(0, 0, 0, 0)
  const diff = hoy.getTime() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function colorAntiguedad(dias) {
  if (dias < 7) {
    return {
      bg: 'bg-green-50',
      texto: 'text-green-700',
      punto: 'border-green-500',
    }
  }
  if (dias < 15) {
    return {
      bg: 'bg-yellow-50',
      texto: 'text-yellow-700',
      punto: 'border-yellow-500',
    }
  }
  if (dias < 30) {
    return {
      bg: 'bg-orange-50',
      texto: 'text-orange-700',
      punto: 'border-orange-500',
    }
  }
  return {
    bg: 'bg-red-50',
    texto: 'text-red-700',
    punto: 'border-red-500',
  }
}

function textoDias(dias) {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'hace 1 día'
  return `hace ${dias} días`
}

function useLocalStorage(clave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave)
      return guardado ? JSON.parse(guardado) : valorInicial
    } catch {
      return valorInicial
    }
  })

  useEffect(() => {
    localStorage.setItem(clave, JSON.stringify(valor))
  }, [clave, valor])

  return [valor, setValor]
}

function formatearTelefonoWhatsApp(tel) {
  if (!tel) return ''
  let limpio = tel.replace(/\D/g, '')
  if (limpio.startsWith('0')) limpio = limpio.slice(1)
  if (limpio.startsWith('593')) return limpio
  return '593' + limpio
}

// ---------- CONFIGURACIÓN INICIAL ----------
function Configuracion({ onGuardar }) {
  const [nombreTienda, setNombreTienda] = useState('')
  const [nombreDueno, setNombreDueno] = useState('')
  const [telefono, setTelefono] = useState('')

  function guardar(e) {
    e.preventDefault()
    if (!nombreTienda.trim() || !nombreDueno.trim()) return
    onGuardar({
      nombreTienda: nombreTienda.trim(),
      nombreDueno: nombreDueno.trim(),
      telefono: telefono.trim(),
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mb-8 pt-8">
        <div className="flex items-center gap-2 mb-1">
          <img
            src="/icon-192.png"
            alt="Aliado"
            className="w-10 h-10 rounded-xl"
          />
          <h1 className="text-3xl font-bold text-gray-800">Aliado</h1>
        </div>
        <p className="text-sm text-gray-600 mt-2 italic">
          "Nunca más solo en tu negocio"
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">
          Configura tu tienda en 1 minuto
        </h2>
      </div>

      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de tu tienda
          </label>
          <input
            type="text"
            value={nombreTienda}
            onChange={(e) => setNombreTienda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Ej: Tienda Doña Marta"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu nombre
          </label>
          <input
            type="text"
            value={nombreDueno}
            onChange={(e) => setNombreDueno(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Ej: Marta Quiñonez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu celular (opcional)
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Ej: 0991234567"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-blue-700"
        >
          Empezar a usar Aliado
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-6">
        Aliado — Tu aliado en la tienda
      </p>
    </div>
  )
}

// ---------- PANTALLA: INICIO ----------
function Inicio({ tienda, onFiado, onMerma, onCerrarDia, onProductos, onConfig }) {
  const [fiados] = useLocalStorage('fiados', [])
  const [mermas] = useLocalStorage('mermas', [])
  const [cierres] = useLocalStorage('cierres', [])
  const [productos] = useLocalStorage('productos', [])

  const totalFiado = fiados.reduce((s, f) => {
    const pagado = f.abonos.reduce((a, ab) => a + ab.monto, 0)
    return s + (f.monto - pagado)
  }, 0)

  const totalMerma = mermas.reduce((s, m) => s + m.valor, 0)
  const cierreHoy = cierres.find(c => esHoy(c.fecha))

  const clientesVencidos = fiados.filter(f => {
    const pagado = f.abonos.reduce((a, ab) => a + ab.monto, 0)
    const deuda = f.monto - pagado
    if (deuda <= 0) return false
    const ultimoMovimiento =
      f.abonos.length > 0 ? f.abonos[f.abonos.length - 1].fecha : f.fecha
    return diasDesde(ultimoMovimiento) >= 15
  }).length

  const valorInventario = productos.reduce(
    (s, p) => s + (p.precioCompra || 0) * (p.stock || 0),
    0
  )

  const productosBajos = productos.filter(
    p => p.stock <= p.stockMinimo && p.stockMinimo > 0
  ).length

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {tienda.nombreTienda}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-EC', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <button
          onClick={onConfig}
          className="text-gray-400 text-2xl leading-none"
          title="Configuración"
        >
          ⚙️
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Fiado pendiente</p>
          <p className="text-2xl font-bold text-gray-800">
            $ {totalFiado.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{fiados.length} clientes</p>
          {clientesVencidos > 0 && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              ⚠️ {clientesVencidos} con deuda vencida
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Merma del mes</p>
          <p className="text-2xl font-bold text-gray-800">
            $ {totalMerma.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{mermas.length} productos</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Ventas de hoy</p>
          {cierreHoy ? (
            <>
              <p className="text-2xl font-bold text-green-600">
                $ {cierreHoy.ventasTotales.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">
                Ganancia estimada: ${cierreHoy.gananciaEstimada.toFixed(2)}
              </p>
              <button
                onClick={onCerrarDia}
                className="w-full bg-gray-200 text-gray-700 rounded-lg py-2 font-medium mt-3 text-sm"
              >
                Ver / editar cierre
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-3">
                Aún no cierras el día
              </p>
              <button
                onClick={onCerrarDia}
                className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium active:bg-blue-700"
              >
                Cerrar día
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Productos en inventario</p>
          <p className="text-2xl font-bold text-purple-600">
            $ {valorInventario.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{productos.length} productos</p>
          {productosBajos > 0 && (
            <p className="text-xs text-red-600 font-medium mt-1">
              ⚠️ {productosBajos} con stock bajo
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={onFiado}
          className="bg-green-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-green-700"
        >
          + Fiado
        </button>
        <button
          onClick={onMerma}
          className="bg-orange-500 text-white rounded-xl py-4 font-medium shadow-sm active:bg-orange-600"
        >
          + Merma
        </button>
      </div>

      <button
        onClick={onProductos}
        className="w-full bg-purple-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-purple-700"
      >
        Ver productos
      </button>
    </div>
  )
}

// ---------- PANTALLA: PRODUCTOS ----------
function Productos({ onVolver }) {
  const [productos, setProductos] = useLocalStorage('productos', [])
  const [vista, setVista] = useState('lista') // 'lista' | 'formulario' | 'agregarStock'
  const [editandoId, setEditandoId] = useState(null)
  const [agregandoStockId, setAgregandoStockId] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  // Formulario de producto
  const [nombre, setNombre] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [stock, setStock] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')

  // Formulario de agregar stock
  const [cantidadLote, setCantidadLote] = useState('')
  const [costoLote, setCostoLote] = useState('')

  const valorInventario = productos.reduce(
    (s, p) => s + (p.precioCompra || 0) * (p.stock || 0),
    0
  )

  const productosBajos = productos.filter(
    p => p.stock <= p.stockMinimo && p.stockMinimo > 0
  )

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    const aBajo = a.stock <= a.stockMinimo && a.stockMinimo > 0
    const bBajo = b.stock <= b.stockMinimo && b.stockMinimo > 0
    if (aBajo && !bBajo) return -1
    if (bBajo && !aBajo) return 1
    return a.nombre.localeCompare(b.nombre)
  })

  const productoStock = productos.find(p => p.id === agregandoStockId)

  function abrirNuevo() {
    setEditandoId(null)
    setNombre('')
    setPrecioCompra('')
    setPrecioVenta('')
    setStock('')
    setStockMinimo('')
    setVista('formulario')
  }

  function abrirEdicion(p) {
    setEditandoId(p.id)
    setNombre(p.nombre)
    setPrecioCompra(String(p.precioCompra))
    setPrecioVenta(String(p.precioVenta))
    setStock(String(p.stock))
    setStockMinimo(String(p.stockMinimo))
    setVista('formulario')
  }

  function abrirAgregarStock(p) {
    setAgregandoStockId(p.id)
    setCantidadLote('')
    setCostoLote(String(p.precioCompra))
    setVista('agregarStock')
  }

  function guardarProducto(e) {
    e.preventDefault()
    if (!nombre.trim()) return

    const datos = {
      nombre: nombre.trim(),
      precioCompra: parseFloat(precioCompra) || 0,
      precioVenta: parseFloat(precioVenta) || 0,
      stock: parseInt(stock) || 0,
      stockMinimo: parseInt(stockMinimo) || 0,
    }

    if (editandoId) {
      const actualizado = productos.map(p =>
        p.id === editandoId ? { ...p, ...datos } : p
      )
      setProductos(actualizado)
    } else {
      const nuevo = {
        id: Date.now(),
        ...datos,
        fecha: new Date().toISOString(),
      }
      setProductos([nuevo, ...productos])
    }

    setEditandoId(null)
    setNombre('')
    setPrecioCompra('')
    setPrecioVenta('')
    setStock('')
    setStockMinimo('')
    setVista('lista')
  }

  function guardarStock(e) {
    e.preventDefault()
    const cant = parseInt(cantidadLote)
    if (!cant || cant <= 0) return

    const costo = parseFloat(costoLote)

    const actualizado = productos.map(p => {
      if (p.id === agregandoStockId) {
        const nuevoStock = p.stock + cant
        return {
          ...p,
          stock: nuevoStock,
          // Si se especificó costo, actualizar precio de compra
          precioCompra: costo > 0 ? costo : p.precioCompra,
        }
      }
      return p
    })
    setProductos(actualizado)
    setAgregandoStockId(null)
    setCantidadLote('')
    setCostoLote('')
    setVista('lista')
  }

  function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return
    setProductos(productos.filter(p => p.id !== id))
  }

  // Vista: AGREGAR STOCK
  if (vista === 'agregarStock' && productoStock) {
    const cant = parseInt(cantidadLote) || 0
    const nuevoStock = productoStock.stock + cant

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button
          onClick={() => {
            setVista('lista')
            setAgregandoStockId(null)
          }}
          className="text-blue-600 font-medium mb-4"
        >
          ← Cancelar
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Agregar stock
        </h1>

        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <p className="font-medium text-gray-800">{productoStock.nombre}</p>
          <p className="text-sm text-gray-500 mt-1">
            Stock actual: <span className="font-bold">{productoStock.stock}</span> unidades
          </p>
          <p className="text-xs text-gray-400">
            Compra: ${productoStock.precioCompra.toFixed(2)} · Venta: $
            {productoStock.precioVenta.toFixed(2)}
          </p>
        </div>

        <form onSubmit={guardarStock} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿Cuántas unidades llegaron?
            </label>
            <input
              type="number"
              step="1"
              value={cantidadLote}
              onChange={(e) => setCantidadLote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-4 bg-white text-2xl text-center font-bold"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo por unidad (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={costoLote}
              onChange={(e) => setCostoLote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-400 mt-1">
              Si el precio cambió, actualízalo aquí. Si no, déjalo igual.
            </p>
          </div>

          {cant > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Stock actual</span>
                <span className="font-medium">{productoStock.stock}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Entrada</span>
                <span className="font-medium text-green-600">+ {cant}</span>
              </div>
              <div className="flex justify-between text-base border-t border-purple-200 pt-2 mt-2">
                <span className="font-semibold text-purple-800">Nuevo stock</span>
                <span className="font-bold text-purple-800">{nuevoStock}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-purple-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-purple-700"
          >
            Agregar al inventario
          </button>
        </form>
      </div>
    )
  }

  // Vista: FORMULARIO de producto
  if (vista === 'formulario') {
    const esEdicion = editandoId !== null
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button
          onClick={() => {
            setVista('lista')
            setEditandoId(null)
          }}
          className="text-blue-600 font-medium mb-4"
        >
          ← Cancelar
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {esEdicion ? 'Editar producto' : 'Nuevo producto'}
        </h1>

        <form onSubmit={guardarProducto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="Ej: Arroz 2kg"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de compra
              </label>
              <input
                type="number"
                step="0.01"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de venta
              </label>
              <input
                type="number"
                step="0.01"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
                placeholder="0.00"
              />
            </div>
          </div>

          {parseFloat(precioVenta) > 0 && parseFloat(precioCompra) > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-700">
                Margen:{' '}
                <span className="font-bold">
                  {(
                    ((parseFloat(precioVenta) - parseFloat(precioCompra)) /
                      parseFloat(precioVenta)) *
                    100
                  ).toFixed(1)}
                  %
                </span>{' '}
                · Ganancia por unidad:{' '}
                <span className="font-bold">
                  ${' '}
                  {(
                    parseFloat(precioVenta) - parseFloat(precioCompra)
                  ).toFixed(2)}
                </span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock actual
              </label>
              <input
                type="number"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock mínimo
              </label>
              <input
                type="number"
                step="1"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
                placeholder="0"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            El stock mínimo es la cantidad a partir de la cual la app te
            avisará que debes comprar más.
          </p>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-purple-700"
          >
            {esEdicion ? 'Actualizar producto' : 'Guardar producto'}
          </button>
        </form>
      </div>
    )
  }

  // Vista: LISTA
  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <button onClick={onVolver} className="text-blue-600 font-medium mb-4">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Productos</h1>
      <p className="text-3xl font-bold text-purple-600 mb-2">
        $ {valorInventario.toFixed(2)}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        {productos.length} productos en inventario
      </p>

      {productosBajos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-700 font-medium">
            ⚠️ {productosBajos.length} producto
            {productosBajos.length !== 1 ? 's' : ''} con stock bajo
          </p>
        </div>
      )}

      {productos.length > 0 && (
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white mb-4"
          placeholder="🔍 Buscar producto..."
        />
      )}

      {productos.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center shadow-sm">
          <p className="text-gray-500">No hay productos registrados</p>
          <p className="text-sm text-gray-400 mt-1">
            Toca "+ Nuevo producto" para empezar
          </p>
        </div>
      ) : productosOrdenados.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center shadow-sm">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {productosOrdenados.map(p => {
            const stockBajo = p.stock <= p.stockMinimo && p.stockMinimo > 0
            const margenP =
              p.precioVenta > 0
                ? ((p.precioVenta - p.precioCompra) / p.precioVenta) * 100
                : 0
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  stockBajo ? 'border-red-500' : 'border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <button
                    onClick={() => abrirEdicion(p)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-500">
                        Stock: {p.stock}
                        {p.stockMinimo > 0 && ` · Mín: ${p.stockMinimo}`}
                      </p>
                      {stockBajo && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          ⚠️ Stock bajo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Compra: ${p.precioCompra.toFixed(2)} · Venta: $
                      {p.precioVenta.toFixed(2)} · Margen: {margenP.toFixed(0)}%
                    </p>
                  </button>
                  <p className="font-bold text-purple-600 ml-2">
                    ${(p.precioCompra * p.stock).toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => abrirAgregarStock(p)}
                    className="bg-purple-600 text-white rounded-lg py-2 text-sm font-medium active:bg-purple-700"
                  >
                    + Stock
                  </button>
                  <button
                    onClick={() => abrirEdicion(p)}
                    className="bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium active:bg-gray-300"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarProducto(p.id)}
                    className="bg-red-50 text-red-600 rounded-lg py-2 text-sm font-medium active:bg-red-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="fixed bottom-4 left-4 right-4">
        <button
          onClick={abrirNuevo}
          className="w-full bg-purple-600 text-white rounded-xl py-4 font-medium shadow-lg active:bg-purple-700"
        >
          + Nuevo producto
        </button>
      </div>
    </div>
  )
}

// ---------- PANTALLA: FIADO ----------
function Fiado({ onVolver, tienda }) {
  const [fiados, setFiados] = useLocalStorage('fiados', [])
  const [vista, setVista] = useState('lista')
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [abonoEditandoIdx, setAbonoEditandoIdx] = useState(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [monto, setMonto] = useState('')
  const [montoAbono, setMontoAbono] = useState('')

  function calcularDeuda(fiado) {
    const pagado = fiado.abonos.reduce((s, a) => s + a.monto, 0)
    return fiado.monto - pagado
  }

  function diasUltimoMovimiento(fiado) {
    const ultimoMovimiento =
      fiado.abonos.length > 0
        ? fiado.abonos[fiado.abonos.length - 1].fecha
        : fiado.fecha
    return diasDesde(ultimoMovimiento)
  }

  const totalPendiente = fiados.reduce((s, f) => s + calcularDeuda(f), 0)
  const seleccionado = fiados.find(f => f.id === seleccionadoId)

  const fiadosOrdenados = [...fiados].sort((a, b) => {
    const deudaA = calcularDeuda(a)
    const deudaB = calcularDeuda(b)
    if (deudaA <= 0 && deudaB > 0) return 1
    if (deudaB <= 0 && deudaA > 0) return -1
    return diasUltimoMovimiento(b) - diasUltimoMovimiento(a)
  })

  function abrirNuevo() {
    setNombre('')
    setTelefono('')
    setMonto('')
    setVista('nuevo')
  }

  function abrirEdicion() {
    if (!seleccionado) return
    setNombre(seleccionado.nombre)
    setTelefono(seleccionado.telefono || '')
    setMonto(String(seleccionado.monto))
    setVista('editar')
  }

  function guardarNuevo(e) {
    e.preventDefault()
    if (!nombre.trim() || !monto || parseFloat(monto) <= 0) return
    const nuevo = {
      id: Date.now(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      monto: parseFloat(monto),
      abonos: [],
      recordatorios: [],
      fecha: new Date().toISOString(),
    }
    setFiados([nuevo, ...fiados])
    setVista('lista')
  }

  function guardarEdicion(e) {
    e.preventDefault()
    if (!nombre.trim() || !monto || parseFloat(monto) <= 0) return
    const actualizado = fiados.map(f => {
      if (f.id === seleccionadoId) {
        return {
          ...f,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          monto: parseFloat(monto),
        }
      }
      return f
    })
    setFiados(actualizado)
    setVista('detalle')
  }

  function guardarAbono(e) {
    e.preventDefault()
    if (!montoAbono || parseFloat(montoAbono) <= 0) return
    const actualizado = fiados.map(f => {
      if (f.id === seleccionadoId) {
        return {
          ...f,
          abonos: [
            ...f.abonos,
            { monto: parseFloat(montoAbono), fecha: new Date().toISOString() },
          ],
        }
      }
      return f
    })
    setFiados(actualizado)
    setMontoAbono('')
  }

  function eliminarAbono(idx) {
    if (!confirm('¿Eliminar este abono?')) return
    const actualizado = fiados.map(f => {
      if (f.id === seleccionadoId) {
        return {
          ...f,
          abonos: f.abonos.filter((_, i) => i !== idx),
        }
      }
      return f
    })
    setFiados(actualizado)
  }

  function actualizarAbono(idx, nuevoMonto) {
    const valor = parseFloat(nuevoMonto)
    if (!valor || valor <= 0) return
    const actualizado = fiados.map(f => {
      if (f.id === seleccionadoId) {
        return {
          ...f,
          abonos: f.abonos.map((a, i) =>
            i === idx ? { ...a, monto: valor } : a
          ),
        }
      }
      return f
    })
    setFiados(actualizado)
    setAbonoEditandoIdx(null)
  }

  function eliminarFiado(id) {
    if (!confirm('¿Eliminar este fiado?')) return
    setFiados(fiados.filter(f => f.id !== id))
    setVista('lista')
    setSeleccionadoId(null)
  }

  function recordarPorWhatsApp() {
    if (!seleccionado) return
    const deuda = calcularDeuda(seleccionado)
    const mensaje = `Hola ${seleccionado.nombre}, le saluda ${
      tienda?.nombreTienda || 'Aliado'
    }. Le recuerdo su saldo pendiente de $${deuda.toFixed(2)}. ¡Gracias!`

    const actualizado = fiados.map(f => {
      if (f.id === seleccionadoId) {
        return {
          ...f,
          recordatorios: [
            ...(f.recordatorios || []),
            { fecha: new Date().toISOString() },
          ],
        }
      }
      return f
    })
    setFiados(actualizado)

    const tel = formatearTelefonoWhatsApp(seleccionado.telefono)
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`

    window.open(url, '_blank')
  }

  if (vista === 'nuevo' || vista === 'editar') {
    const esEdicion = vista === 'editar'
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button
          onClick={() => {
            setVista(esEdicion ? 'detalle' : 'lista')
          }}
          className="text-blue-600 font-medium mb-4"
        >
          ← Cancelar
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {esEdicion ? 'Editar fiado' : 'Nuevo fiado'}
        </h1>

        <form
          onSubmit={esEdicion ? guardarEdicion : guardarNuevo}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del cliente
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="Ej: Doña Rosa"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Celular del cliente (opcional)
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="Ej: 0991234567"
            />
            <p className="text-xs text-gray-400 mt-1">
              Si lo pones, podrás recordarle por WhatsApp con un toque.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto
            </label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="0.00"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-green-700"
          >
            {esEdicion ? 'Actualizar fiado' : 'Guardar fiado'}
          </button>
        </form>
      </div>
    )
  }

  if (vista === 'detalle' && seleccionado) {
    const deuda = calcularDeuda(seleccionado)
    const recordatorios = seleccionado.recordatorios || []
    const ultimoRecordatorio = recordatorios[recordatorios.length - 1]
    const dias = diasUltimoMovimiento(seleccionado)
    const color = colorAntiguedad(dias)

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              setVista('lista')
              setSeleccionadoId(null)
            }}
            className="text-blue-600 font-medium"
          >
            ← Volver
          </button>
          <button
            onClick={abrirEdicion}
            className="text-blue-600 font-medium text-sm"
          >
            ✏️ Editar
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {seleccionado.nombre}
        </h1>
        {seleccionado.telefono && (
          <p className="text-sm text-gray-500 mb-1">
            📱 {seleccionado.telefono}
          </p>
        )}
        <p className="text-3xl font-bold text-red-600 mb-2">
          $ {deuda.toFixed(2)}
        </p>

        {deuda > 0 && (
          <div
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${color.bg} ${color.texto}`}
          >
            Último movimiento: {textoDias(dias)}
          </div>
        )}

        {deuda > 0 && (
          <button
            onClick={recordarPorWhatsApp}
            className="w-full bg-green-500 text-white rounded-xl py-4 font-medium shadow-sm active:bg-green-600 mb-4 flex items-center justify-center gap-2"
          >
            <span>📱</span>
            <span>Recordar por WhatsApp</span>
          </button>
        )}

        {ultimoRecordatorio && (
          <p className="text-xs text-gray-400 text-center mb-4">
            Último recordatorio: {formatearFecha(ultimoRecordatorio.fecha)}
          </p>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Historial</p>
          <div className="space-y-3">
            <div className="flex justify-between items-start text-sm border-b border-gray-100 pb-2">
              <div>
                <p className="font-medium text-gray-800">Fiado registrado</p>
                <p className="text-xs text-gray-400">
                  {formatearFecha(seleccionado.fecha)}
                </p>
              </div>
              <span className="text-red-600 font-medium">
                + ${seleccionado.monto.toFixed(2)}
              </span>
            </div>

            {seleccionado.abonos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                Sin abonos todavía
              </p>
            ) : (
              seleccionado.abonos.map((a, i) => (
                <div key={i} className="text-sm">
                  {abonoEditandoIdx === i ? (
                    <AbonoEdicion
                      montoInicial={a.monto}
                      onCancelar={() => setAbonoEditandoIdx(null)}
                      onGuardar={(nuevoMonto) => actualizarAbono(i, nuevoMonto)}
                    />
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">
                          Abono #{i + 1}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatearFecha(a.fecha)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-600 font-medium">
                          - ${a.monto.toFixed(2)}
                        </span>
                        <div className="flex gap-2 justify-end mt-0.5">
                          <button
                            onClick={() => setAbonoEditandoIdx(i)}
                            className="text-xs text-blue-500"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarAbono(i)}
                            className="text-xs text-red-500"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {recordatorios.length > 0 && (
              <div className="border-t border-gray-100 pt-2">
                <p className="text-xs text-gray-400 mb-2">
                  Recordatorios enviados
                </p>
                {recordatorios.map((r, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs text-gray-500 py-1"
                  >
                    <span>📱 Recordatorio #{i + 1}</span>
                    <span>{formatearFecha(r.fecha)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={guardarAbono}
          className="bg-white rounded-xl p-4 shadow-sm mb-4"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registrar abono
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={montoAbono}
              onChange={(e) => setMontoAbono(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="0.00"
            />
            <button
              type="submit"
              className="bg-green-600 text-white rounded-lg px-4 font-medium"
            >
              Abonar
            </button>
          </div>
        </form>

        <button
          onClick={() => eliminarFiado(seleccionado.id)}
          className="w-full text-red-600 font-medium py-3"
        >
          Eliminar fiado
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <button onClick={onVolver} className="text-blue-600 font-medium mb-4">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Fiado</h1>
      <p className="text-3xl font-bold text-red-600 mb-2">
        $ {totalPendiente.toFixed(2)}
      </p>
      <p className="text-xs text-gray-500 mb-6">
        Ordenado por antigüedad (más viejo primero)
      </p>

      {fiados.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center shadow-sm">
          <p className="text-gray-500">No hay fiados registrados</p>
          <p className="text-sm text-gray-400 mt-1">
            Toca "+ Nuevo fiado" para empezar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fiadosOrdenados.map(f => {
            const deuda = calcularDeuda(f)
            const dias = diasUltimoMovimiento(f)
            const color = colorAntiguedad(dias)
            return (
              <button
                key={f.id}
                onClick={() => {
                  setSeleccionadoId(f.id)
                  setVista('detalle')
                }}
                className={`w-full text-left bg-white rounded-xl p-4 shadow-sm active:bg-gray-50 border-l-4 ${
                  deuda > 0 ? color.punto : 'border-transparent'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{f.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400">
                        {formatearFecha(f.fecha)}
                        {f.telefono && ' · 📱'}
                      </p>
                      {deuda > 0 && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.texto}`}
                        >
                          {textoDias(dias)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className={`font-bold ${
                      deuda > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    $ {deuda.toFixed(2)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="fixed bottom-4 left-4 right-4">
        <button
          onClick={abrirNuevo}
          className="w-full bg-green-600 text-white rounded-xl py-4 font-medium shadow-lg active:bg-green-700"
        >
          + Nuevo fiado
        </button>
      </div>
    </div>
  )
}

function AbonoEdicion({ montoInicial, onCancelar, onGuardar }) {
  const [valor, setValor] = useState(String(montoInicial))

  return (
    <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
      <input
        type="number"
        step="0.01"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
        autoFocus
      />
      <button
        onClick={() => onGuardar(valor)}
        className="text-xs bg-green-600 text-white px-3 py-1 rounded"
      >
        Guardar
      </button>
      <button
        onClick={onCancelar}
        className="text-xs text-gray-600 px-2 py-1"
      >
        Cancelar
      </button>
    </div>
  )
}

// ---------- PANTALLA: MERMA ----------
function Merma({ onVolver }) {
  const [mermas, setMermas] = useLocalStorage('mermas', [])
  const [vista, setVista] = useState('lista')
  const [editandoId, setEditandoId] = useState(null)

  const [producto, setProducto] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('vencido')
  const [valor, setValor] = useState('')

  const totalMerma = mermas.reduce((s, m) => s + m.valor, 0)

  function abrirNueva() {
    setEditandoId(null)
    setProducto('')
    setCantidad('')
    setMotivo('vencido')
    setValor('')
    setVista('formulario')
  }

  function abrirEdicion(m) {
    setEditandoId(m.id)
    setProducto(m.producto)
    setCantidad(String(m.cantidad))
    setMotivo(m.motivo)
    setValor(String(m.valor))
    setVista('formulario')
  }

  function guardar(e) {
    e.preventDefault()
    if (!producto.trim() || !cantidad || parseFloat(cantidad) <= 0) return

    if (editandoId) {
      const actualizada = mermas.map(m => {
        if (m.id === editandoId) {
          return {
            ...m,
            producto: producto.trim(),
            cantidad: parseInt(cantidad),
            motivo,
            valor: parseFloat(valor) || 0,
          }
        }
        return m
      })
      setMermas(actualizada)
    } else {
      const nueva = {
        id: Date.now(),
        producto: producto.trim(),
        cantidad: parseInt(cantidad),
        motivo,
        valor: parseFloat(valor) || 0,
        fecha: new Date().toISOString(),
      }
      setMermas([nueva, ...mermas])
    }

    setEditandoId(null)
    setProducto('')
    setCantidad('')
    setMotivo('vencido')
    setValor('')
    setVista('lista')
  }

  function eliminarMerma(id) {
    if (!confirm('¿Eliminar este registro?')) return
    setMermas(mermas.filter(m => m.id !== id))
  }

  const motivos = [
    { valor: 'vencido', etiqueta: 'Vencido' },
    { valor: 'dañado', etiqueta: 'Dañado' },
    { valor: 'roto', etiqueta: 'Roto' },
    { valor: 'otro', etiqueta: 'Otro' },
  ]

  function etiquetaMotivo(valor) {
    const m = motivos.find(x => x.valor === valor)
    return m ? m.etiqueta : valor
  }

  if (vista === 'formulario') {
    const esEdicion = editandoId !== null
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <button
          onClick={() => {
            setVista('lista')
            setEditandoId(null)
          }}
          className="text-blue-600 font-medium mb-4"
        >
          ← Cancelar
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {esEdicion ? 'Editar merma' : 'Registrar merma'}
        </h1>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto
            </label>
            <input
              type="text"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="Ej: Yogurt 1L"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <input
              type="number"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {motivos.map(m => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => setMotivo(m.valor)}
                  className={`py-3 rounded-lg font-medium border ${
                    motivo === m.valor
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor estimado (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              placeholder="0.00"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 text-white rounded-xl py-4 font-medium shadow-sm active:bg-orange-600"
          >
            {esEdicion ? 'Actualizar merma' : 'Guardar merma'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <button onClick={onVolver} className="text-blue-600 font-medium mb-4">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Merma</h1>
      <p className="text-3xl font-bold text-orange-600 mb-6">
        $ {totalMerma.toFixed(2)}
      </p>

      {mermas.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center shadow-sm">
          <p className="text-gray-500">No hay mermas registradas</p>
          <p className="text-sm text-gray-400 mt-1">
            Toca "+ Registrar merma" para empezar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mermas.map(m => (
            <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <button
                  onClick={() => abrirEdicion(m)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-gray-800">{m.producto}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.cantidad} unidad{m.cantidad !== 1 ? 'es' : ''} ·{' '}
                    {etiquetaMotivo(m.motivo)} · {formatearFecha(m.fecha)}
                  </p>
                </button>
                <div className="text-right ml-3">
                  <p className="font-bold text-orange-600">
                    $ {m.valor.toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-1 justify-end">
                    <button
                      onClick={() => abrirEdicion(m)}
                      className="text-xs text-blue-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarMerma(m.id)}
                      className="text-xs text-red-500"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-4 left-4 right-4">
        <button
          onClick={abrirNueva}
          className="w-full bg-orange-500 text-white rounded-xl py-4 font-medium shadow-lg active:bg-orange-600"
        >
          + Registrar merma
        </button>
      </div>
    </div>
  )
}

// ---------- PANTALLA: CERRAR DÍA ----------
function CerrarDia({ onVolver }) {
  const [fiados] = useLocalStorage('fiados', [])
  const [cierres, setCierres] = useLocalStorage('cierres', [])

  const hoy = new Date().toDateString()
  const cierreHoy = cierres.find(c => new Date(c.fecha).toDateString() === hoy)

  const fiadoDadoHoy = fiados
    .filter(f => esHoy(f.fecha))
    .reduce((s, f) => s + f.monto, 0)

  const fiadoCobradoHoy = fiados.reduce((s, f) => {
    return (
      s +
      f.abonos
        .filter(a => esHoy(a.fecha))
        .reduce((sa, a) => sa + a.monto, 0)
    )
  }, 0)

  const [efectivoFinal, setEfectivoFinal] = useState(
    cierreHoy ? String(cierreHoy.efectivoFinal) : ''
  )
  const [efectivoInicial, setEfectivoInicial] = useState(
    cierreHoy ? String(cierreHoy.efectivoInicial) : '0'
  )
  const [retiro, setRetiro] = useState(cierreHoy ? String(cierreHoy.retiro) : '0')

  const MARGEN = 0.25

  function calcular() {
    const ef = parseFloat(efectivoFinal) || 0
    const ei = parseFloat(efectivoInicial) || 0
    const r = parseFloat(retiro) || 0

    const ventasEfectivo = ef - ei + r
    const ventasTotales = ventasEfectivo + fiadoDadoHoy - fiadoCobradoHoy
    const gananciaEstimada = ventasTotales * MARGEN

    return {
      ventasEfectivo,
      ventasTotales,
      gananciaEstimada,
      fiadoDadoHoy,
      fiadoCobradoHoy,
    }
  }

  function guardar(e) {
    e.preventDefault()
    const r = calcular()
    const nuevo = {
      id: cierreHoy ? cierreHoy.id : Date.now(),
      fecha: new Date().toISOString(),
      efectivoFinal: parseFloat(efectivoFinal) || 0,
      efectivoInicial: parseFloat(efectivoInicial) || 0,
      retiro: parseFloat(retiro) || 0,
      fiadoDadoHoy: r.fiadoDadoHoy,
      fiadoCobradoHoy: r.fiadoCobradoHoy,
      ventasEfectivo: r.ventasEfectivo,
      ventasTotales: r.ventasTotales,
      gananciaEstimada: r.gananciaEstimada,
    }

    if (cierreHoy) {
      setCierres(cierres.map(c => (c.id === cierreHoy.id ? nuevo : c)))
    } else {
      setCierres([nuevo, ...cierres])
    }

    onVolver()
  }

  const r = calcular()

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <button onClick={onVolver} className="text-blue-600 font-medium mb-4">
        ← Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Cerrar día</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date().toLocaleDateString('es-EC', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </p>

      <form onSubmit={guardar} className="space-y-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            1. ¿Cuánto efectivo hay en la caja?
          </label>
          <input
            type="number"
            step="0.01"
            value={efectivoFinal}
            onChange={(e) => setEfectivoFinal(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-lg"
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            2. ¿Cuánto había al abrir?
          </label>
          <input
            type="number"
            step="0.01"
            value={efectivoInicial}
            onChange={(e) => setEfectivoInicial(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-lg"
            placeholder="0.00"
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            3. ¿Retiraste para casa? (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            value={retiro}
            onChange={(e) => setRetiro(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-lg"
            placeholder="0.00"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700 font-medium mb-3">
            Cálculo automático
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Fiado prestado hoy</span>
              <span className="font-medium">$ {fiadoDadoHoy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fiado cobrado hoy</span>
              <span className="font-medium">$ {fiadoCobradoHoy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-2">
              <span className="text-gray-600">Fiado neto del día</span>
              <span className="font-medium text-orange-600">
                $ {(fiadoDadoHoy - fiadoCobradoHoy).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ventas en efectivo</span>
              <span className="font-medium">
                $ {r.ventasEfectivo.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base border-t border-blue-200 pt-2">
              <span className="font-semibold text-blue-800">Ventas totales</span>
              <span className="font-bold text-blue-800">
                $ {r.ventasTotales.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ganancia estimada (25%)</span>
              <span className="font-medium text-green-600">
                $ {r.gananciaEstimada.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-xl py-4 font-medium shadow-sm active:bg-blue-700"
        >
          {cierreHoy ? 'Actualizar cierre' : 'Guardar cierre del día'}
        </button>
      </form>

      {cierres.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Últimos cierres
          </h2>
          <div className="space-y-2">
            {cierres.slice(0, 5).map(c => (
              <div
                key={c.id}
                className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {formatearFecha(c.fecha)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Ganancia: ${c.gananciaEstimada.toFixed(2)}
                  </p>
                </div>
                <p className="font-bold text-gray-800">
                  $ {c.ventasTotales.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- APP PRINCIPAL ----------
function App() {
  const [tienda, setTienda] = useLocalStorage('tienda', null)
  const [pantalla, setPantalla] = useState('inicio')

  if (!tienda) {
    return <Configuracion onGuardar={setTienda} />
  }

  if (pantalla === 'config') {
    return (
      <Configuracion
        onGuardar={(datos) => {
          setTienda(datos)
          setPantalla('inicio')
        }}
      />
    )
  }

  if (pantalla === 'fiado') {
    return <Fiado onVolver={() => setPantalla('inicio')} tienda={tienda} />
  }
  if (pantalla === 'merma') {
    return <Merma onVolver={() => setPantalla('inicio')} />
  }
  if (pantalla === 'cerrarDia') {
    return <CerrarDia onVolver={() => setPantalla('inicio')} />
  }
  if (pantalla === 'productos') {
    return <Productos onVolver={() => setPantalla('inicio')} />
  }
  return (
    <Inicio
      tienda={tienda}
      onFiado={() => setPantalla('fiado')}
      onMerma={() => setPantalla('merma')}
      onCerrarDia={() => setPantalla('cerrarDia')}
      onProductos={() => setPantalla('productos')}
      onConfig={() => setPantalla('config')}
    />
  )
}

export default App