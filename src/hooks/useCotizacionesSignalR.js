import { useEffect, useState, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { crearConexionCotizaciones } from '../services/cotizacionesSignalR'
import { aEntidad } from '../services/adaptadores'

function extraerListaEntidades(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload.map(aEntidad).filter(Boolean)
  const lista = payload.cotizaciones ?? payload.entidades ?? payload.items
  if (Array.isArray(lista)) return lista.map(aEntidad).filter(Boolean)
  if (payload.id || payload.entidadId || payload.codigo || payload.codigo_entidad) {
    const unica = aEntidad(payload)
    return unica ? [unica] : []
  }
  return []
}

export function useCotizacionesSignalR(obtenerToken) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [conectado, setConectado] = useState(false)
  const obtenerTokenRef = useRef(obtenerToken)
  const ultimaSecuenciaRef = useRef(null)

  useEffect(() => {
    obtenerTokenRef.current = obtenerToken
  }, [obtenerToken])

  useEffect(() => {
    let montado = true
    const connection = crearConexionCotizaciones(() =>
      typeof obtenerTokenRef.current === 'function'
        ? obtenerTokenRef.current()
        : localStorage.getItem('token'),
    )

    const manejarMensaje = (payload) => {
      if (!montado || !payload) return

      // Descartar secuencias repetidas según contrato HU-BE-04 (docs/api/openapi-v1.json)
      if (payload.secuencia !== undefined && payload.secuencia !== null) {
        if (ultimaSecuenciaRef.current === payload.secuencia) return
        ultimaSecuenciaRef.current = payload.secuencia
      }

      const recibidas = extraerListaEntidades(payload)
      if (recibidas.length === 0) return

      setCotizaciones((prev) => {
        const mapa = new Map(prev.map((item) => [item.codigo || item.id, item]))
        for (const nueva of recibidas) {
          const clave = nueva.codigo || nueva.id
          if (clave) {
            mapa.set(clave, { ...(mapa.get(clave) ?? {}), ...nueva })
          }
        }
        return Array.from(mapa.values())
      })
    }

    connection.on('RecibirCotizacion', manejarMensaje)
    connection.on('RecibirCotizaciones', manejarMensaje)
    connection.on('cotizaciones', manejarMensaje)
    connection.on('CotizacionesActualizadas', manejarMensaje)

    connection.onreconnected(() => {
      if (montado) setConectado(true)
    })

    connection.onclose(() => {
      if (montado) setConectado(false)
    })

    async function iniciarConexion() {
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start()
          if (montado) setConectado(true)
        }
      } catch {
        if (montado) setConectado(false)
      }
    }

    let arrancada = false
    const timer = setTimeout(() => {
      if (!montado) return
      arrancada = true
      iniciarConexion()
    }, 0)

    return () => {
      montado = false
      clearTimeout(timer)
      if (arrancada && connection.state !== signalR.HubConnectionState.Disconnected) {
        connection.stop().catch(() => {})
      }
    }
  }, [])

  return { cotizaciones, conectado }
}
