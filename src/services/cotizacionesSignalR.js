import * as signalR from '@microsoft/signalr'
import { ENDPOINTS } from './endpoints'

const API_URL = import.meta.env.VITE_API_URL || 'https://siftc.onrender.com'

export function crearConexionCotizaciones(obtenerToken) {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}${ENDPOINTS.hubCotizaciones}`, {
      accessTokenFactory: () => (typeof obtenerToken === 'function' ? obtenerToken() : localStorage.getItem('token')) ?? '',
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build()
}
