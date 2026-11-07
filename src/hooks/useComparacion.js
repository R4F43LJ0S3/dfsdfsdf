// HU-FE-05 · Estado de la comparación.
// - CA 1: acepta de 2 a 4 entidades y avisa si se intenta agregar una quinta.
// - CA 3: la selección se conserva al recargar (URL + localStorage como respaldo).
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MIN_ENTIDADES, MAX_ENTIDADES, PARAM_ENTIDADES, PARAM_PERIODO, CLAVE_ALMACEN,
} from '../constants/comparador'
import { PERIODOS, PERIODO_POR_DEFECTO } from '../constants/periodos'
import {
  leerCodigos, escribirCodigos, sanearSeleccion, agregarCodigo, quitarCodigo,
  normalizarPeriodo, leerAlmacen, guardarAlmacen,
} from '../utils/comparador'

const almacen = () => (typeof window !== 'undefined' ? window.localStorage : null)

/**
 * @param {Array|null} entidades lista de GET /entidades ya adaptada, o null mientras carga.
 */
export default function useComparacion(entidades) {
  const [params, setParams] = useSearchParams()

  // Última selección conocida: arranca desde localStorage y se actualiza en cada cambio.
  // Se usa cuando la URL no trae ?entidades= (por ejemplo, al entrar desde el menú).
  const [ultima, setUltima] = useState(() => leerAlmacen(almacen(), CLAVE_ALMACEN))
  const [aviso, setAviso] = useState(null)

  const textoUrl = params.get(PARAM_ENTIDADES)
  const desdeUrl = textoUrl !== null
  const pedidos = useMemo(
    () => (desdeUrl ? leerCodigos(textoUrl) : ultima.entidades),
    [desdeUrl, textoUrl, ultima.entidades],
  )
  const periodo = normalizarPeriodo(params.get(PARAM_PERIODO) ?? ultima.periodo, PERIODOS, PERIODO_POR_DEFECTO)

  const listo = Array.isArray(entidades)
  const codigosValidos = useMemo(() => (listo ? entidades.map((e) => e.codigo ?? e.codigo_entidad) : []), [listo, entidades])
  const saneado = useMemo(
    () => (listo ? sanearSeleccion(pedidos, codigosValidos) : { seleccion: [], excedentes: [], desconocidos: [] }),
    [listo, pedidos, codigosValidos],
  )
  const { seleccion } = saneado

  // Un enlace compartido puede traer más de 4 entidades o códigos que ya no existen:
  // se muestran solo las válidas (máx. 4) y se explica qué se descartó.
  const avisoEnlace = desdeUrl && (saneado.excedentes.length > 0 || saneado.desconocidos.length > 0)
    ? { excedentes: saneado.excedentes, desconocidos: saneado.desconocidos }
    : null

  const aplicar = (nuevaSeleccion, nuevoPeriodo = periodo) => {
    const datos = { entidades: nuevaSeleccion, periodo: nuevoPeriodo }
    guardarAlmacen(almacen(), CLAVE_ALMACEN, datos)
    setUltima(datos)
    const siguiente = { [PARAM_ENTIDADES]: escribirCodigos(nuevaSeleccion) }
    if (nuevoPeriodo !== PERIODO_POR_DEFECTO) siguiente[PARAM_PERIODO] = nuevoPeriodo
    // replace: elegir entidades no debe llenar el historial del botón "Atrás"
    setParams(siguiente, { replace: true })
  }

  const agregar = (codigo) => {
    const resultado = agregarCodigo(seleccion, codigo)
    if (resultado.rechazo === 'limite') {
      setAviso({ tipo: 'limite', codigo })
      return false
    }
    if (resultado.rechazo) return false
    setAviso(null)
    aplicar(resultado.seleccion)
    return true
  }

  const quitar = (codigo) => {
    setAviso(null)
    aplicar(quitarCodigo(seleccion, codigo))
  }

  const alternar = (codigo) => (seleccion.includes(codigo) ? quitar(codigo) : agregar(codigo))

  const limpiar = () => {
    setAviso(null)
    aplicar([])
  }

  const cambiarPeriodo = (nuevo) => aplicar(seleccion, normalizarPeriodo(nuevo, PERIODOS, PERIODO_POR_DEFECTO))

  return {
    listo,
    seleccion,
    periodo,
    aviso,
    avisoEnlace,
    lleno: seleccion.length >= MAX_ENTIDADES,
    suficientes: seleccion.length >= MIN_ENTIDADES,
    faltan: Math.max(0, MIN_ENTIDADES - seleccion.length),
    agregar,
    quitar,
    alternar,
    limpiar,
    cambiarPeriodo,
    cerrarAviso: () => setAviso(null),
  }
}
