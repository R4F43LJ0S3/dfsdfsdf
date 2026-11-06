#!/usr/bin/env node
/**
 * Comprueba por qué los filtros del ranking no cambian nada.
 *
 *   npm run probar:filtros -- <usuario> <clave>
 *
 * Hace login, mira qué valores reales existen de dimensión y frecuencia en /metricas,
 * y luego llama a /ranking variando un filtro a la vez para ver si el total cambia.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const c = { reset: '\x1b[0m', rojo: '\x1b[31m', verde: '\x1b[32m', amarillo: '\x1b[33m', azul: '\x1b[36m', gris: '\x1b[90m' }
const log = (...a) => console.log(...a)

const env = {}
for (const archivo of ['.env.local', '.env']) {
  try {
    for (const linea of readFileSync(resolve(raiz, archivo), 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* puede no existir */ }
}
const api = `${(env.VITE_API_URL || '').replace(/\/$/, '')}${env.VITE_API_PREFIX ?? '/api/v1'}`
const [usuario, password] = process.argv.slice(2)

if (!usuario || !password) {
  log(`${c.rojo}Faltan credenciales:${c.reset} npm run probar:filtros -- <usuario> <clave>`)
  process.exit(1)
}

async function pedir(ruta, token, ms = 90000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(`${api}${ruta}`, { signal: ctrl.signal, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
    const texto = await res.text()
    let dato = null
    try { dato = JSON.parse(texto) } catch { dato = texto.slice(0, 200) }
    return { status: res.status, dato }
  } catch (err) { return { status: 0, error: err.message } } finally { clearTimeout(t) }
}

log(`\n${c.azul}Login...${c.reset}`)
const resLogin = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario, password }),
})
if (!resLogin.ok) { log(`${c.rojo}x login ${resLogin.status}: ${(await resLogin.text()).slice(0, 200)}${c.reset}`); process.exit(1) }
const token = (await resLogin.json()).token
log(`${c.verde}OK${c.reset}`)

// 1) Qué valores existen de verdad
log(`\n${c.azul}1) Valores reales en /metricas:${c.reset}`)
const met = await pedir('/metricas?size=500', token)
const filas = Array.isArray(met.dato) ? met.dato : []
log(`   ${filas.length} filas leídas`)
const unicos = (campo) => [...new Set(filas.map((m) => m[campo]).filter(Boolean))]
const dimensiones = unicos('dimension')
const frecuencias = unicos('frecuencia')
const fechas = unicos('fecha').sort()
log(`   dimension  : ${JSON.stringify(dimensiones)}`)
log(`   frecuencia : ${JSON.stringify(frecuencias)}`)
log(`   fecha      : ${fechas.length} distintas (${fechas[0]} ... ${fechas[fechas.length - 1]})`)
log(`   sector     : ${JSON.stringify(unicos('sector'))}`)

// 2) /ranking variando un filtro a la vez
log(`\n${c.azul}2) /ranking variando un filtro a la vez:${c.reset}`)
const base = await pedir('/ranking', token)
const resumen = (r) => {
  if (r.status !== 200) return `${c.rojo}${r.status || r.error}${c.reset}`
  const d = r.dato ?? {}
  const items = d.items ?? []
  const primero = items[0] ? (items[0].entidad ?? items[0].nombre ?? JSON.stringify(items[0]).slice(0, 40)) : '-'
  return `total=${d.total ?? items.length}  periodo=${d.periodo ?? '?'}  1ro=${primero}`
}
log(`   sin filtros            -> ${resumen(base)}`)

const pruebas = []
for (const d of dimensiones.slice(0, 3)) pruebas.push([`dimension=${d}`, `/ranking?dimension=${encodeURIComponent(d)}`])
for (const f of frecuencias.slice(0, 3)) pruebas.push([`periodo=${f}`, `/ranking?periodo=${encodeURIComponent(f)}`])
for (const f of frecuencias.slice(0, 2)) pruebas.push([`periodo=${f.toLowerCase()}`, `/ranking?periodo=${encodeURIComponent(f.toLowerCase())}`])
if (fechas.length) pruebas.push([`periodo=${fechas[fechas.length - 1]}`, `/ranking?periodo=${encodeURIComponent(fechas[fechas.length - 1])}`])
pruebas.push(['periodo=mensual (lo que manda el front)', '/ranking?periodo=mensual'])
pruebas.push(['dimension=Rentabilidad (mock)', '/ranking?dimension=Rentabilidad'])

for (const [etiqueta, ruta] of pruebas) {
  const r = await pedir(ruta, token)
  log(`   ${etiqueta.padEnd(38)} -> ${resumen(r)}`)
}

log(`\n${c.gris}Si el total y el primer puesto no cambian nunca, el filtro lo está ignorando el backend.${c.reset}\n`)
