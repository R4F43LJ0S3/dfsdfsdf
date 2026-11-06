#!/usr/bin/env node
/**
 * Diagnóstico de conexión con la API SIFTC desplegada en Render.
 *   npm run diagnostico:api
 *
 *  1. Lee VITE_API_URL y VITE_API_PREFIX de tu .env
 *  2. Despierta la instancia y mide cuánto tarda
 *  3. Descarga el OpenAPI y lista TODAS las rutas reales del servidor
 *  4. Contrasta esas rutas con las que usa el front (src/services/endpoints.js)
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENDPOINTS } from '../src/services/endpoints.js'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const c = { reset: '\x1b[0m', rojo: '\x1b[31m', verde: '\x1b[32m', amarillo: '\x1b[33m', azul: '\x1b[36m', gris: '\x1b[90m' }
const log = (...a) => console.log(...a)

function leerEnv() {
  const env = {}
  for (const archivo of ['.env.local', '.env']) {
    try {
      for (const linea of readFileSync(resolve(raiz, archivo), 'utf8').split('\n')) {
        const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* puede no existir */ }
  }
  return env
}

async function pedir(url, ms = 90000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    return { ok: res.ok, status: res.status, texto: await res.text() }
  } catch (err) {
    return { ok: false, status: 0, error: err.message }
  } finally { clearTimeout(t) }
}

function parecido(a, b) {
  const ta = new Set(a.split(/[/\-{}]/).filter(Boolean))
  const tb = new Set(b.split(/[/\-{}]/).filter(Boolean))
  return [...ta].filter((x) => tb.has(x)).length / Math.max(ta.size, tb.size, 1)
}

const env = leerEnv()
const base = (env.VITE_API_URL || 'https://siftc.onrender.com').replace(/\/$/, '')
const prefijo = env.VITE_API_PREFIX ?? '/api/v1'

log(`\n${c.azul}=== Diagnóstico API SIFTC ===${c.reset}`)
log(`Servidor : ${base}`)
log(`Prefijo  : ${prefijo}`)
log(`Modo     : Producción externa (Render) · Modo simulado eliminado`)


log(`\n${c.azul}1) Despertando la instancia (hasta 60 s si estaba dormida)...${c.reset}`)
const inicio = Date.now()
const salud = await pedir(`${base}${ENDPOINTS.health}`) // health cuelga de la raíz, no de /api/v1
const ms = Date.now() - inicio
if (salud.status === 0) log(`${c.rojo}x Sin respuesta: ${salud.error}${c.reset}`)
else if (salud.ok) {
  log(`${c.verde}OK ${ENDPOINTS.health} respondió ${salud.status} en ${ms} ms${c.reset}`)
  if (ms > 10000) log(`${c.amarillo}   Tardó más de 10 s: era arranque en frío.${c.reset}`)
} else log(`${c.amarillo}~ ${ENDPOINTS.health} respondió ${salud.status} en ${ms} ms (la ruta de health puede ser otra)${c.reset}`)

log(`\n${c.azul}2) Buscando el documento OpenAPI...${c.reset}`)
const candidatos = ['/openapi/v1.json', '/openapi/v1/openapi.json', '/openapi.json', '/swagger/v1/swagger.json', `${prefijo}/openapi.json`]
let spec = null, urlSpec = null
for (const ruta of candidatos) {
  const r = await pedir(`${base}${ruta}`, 30000)
  if (r.ok && r.texto?.trim().startsWith('{')) {
    try { spec = JSON.parse(r.texto); urlSpec = `${base}${ruta}`; log(`${c.verde}OK encontrado en ${ruta}${c.reset}`); break } catch {}
  }
  log(`${c.gris}   ${ruta} -> ${r.status || r.error}${c.reset}`)
}
if (!spec) {
  log(`${c.rojo}\nx No se encontró el OpenAPI en las rutas habituales.${c.reset}`)
  log(`${c.gris}   Abre ${base}/docs/ y usa "Download OpenAPI Document" para ver la URL real,`)
  log(`   luego agrégala al array "candidatos" de este script.${c.reset}\n`)
  process.exit(1)
}

const rutasReales = []
for (const [ruta, metodos] of Object.entries(spec.paths ?? {}))
  for (const metodo of Object.keys(metodos))
    if (['get', 'post', 'put', 'patch', 'delete'].includes(metodo)) rutasReales.push({ metodo: metodo.toUpperCase(), ruta })

log(`\n${c.azul}3) Rutas publicadas por el servidor (${rutasReales.length}):${c.reset}`)
for (const { metodo, ruta } of [...rutasReales].sort((a, b) => a.ruta.localeCompare(b.ruta))) log(`   ${metodo.padEnd(6)} ${ruta}`)

log(`\n${c.azul}4) Rutas que usa el front vs. el servidor:${c.reset}`)
const usadas = [
  ['login (POST)', ENDPOINTS.login],
  ['registrarUsuario (POST)', ENDPOINTS.registrarUsuario],
  ['roles (GET)', ENDPOINTS.roles],
  ['metricas (GET)', ENDPOINTS.metricas],
  ['entidades (GET)', ENDPOINTS.entidades],
  ['ohlc (GET)', ENDPOINTS.ohlc('{id}')],
  ['indiceGeneral (GET)', ENDPOINTS.indiceGeneral],
  ['top (GET)', ENDPOINTS.top],
  ['ranking (GET)', ENDPOINTS.ranking],
  ['sectores (GET)', ENDPOINTS.sectores],
  ['dimensiones (GET)', ENDPOINTS.dimensiones],
  ['periodos (GET)', ENDPOINTS.periodos],
]
const normalizar = (r) => r.replace(/\{[^}]+\}/g, '{id}').replace(/\/$/, '').toLowerCase()
const conjuntoReal = new Set(rutasReales.map((r) => normalizar(r.ruta)))
let fallan = 0
for (const [nombre, ruta] of usadas) {
  if (!ruta) { log(`${c.gris}   -  ${nombre.padEnd(26)} (sin endpoint en el servidor: se usan datos de ejemplo)${c.reset}`); continue }
  const completa = normalizar(`${prefijo}${ruta}`)
  if (conjuntoReal.has(completa)) { log(`${c.verde}   OK ${nombre.padEnd(26)} ${prefijo}${ruta}${c.reset}`); continue }
  fallan += 1
  const s = rutasReales.map((r) => ({ ...r, p: parecido(normalizar(r.ruta), completa) })).sort((a, b) => b.p - a.p)[0]
  log(`${c.rojo}   x  ${nombre.padEnd(26)} ${prefijo}${ruta}${c.reset}`)
  if (s && s.p > 0.2) {
    const corregida = s.ruta.startsWith(prefijo) ? s.ruta.slice(prefijo.length) : s.ruta
    log(`${c.amarillo}       ¿será esta? -> ${s.ruta}${c.reset}`)
    log(`${c.gris}       en src/services/endpoints.js: '${corregida}'${c.reset}`)
  }
}

log(`\n${c.azul}5) CORS:${c.reset}`)
log(`${c.gris}   Este script corre en Node y NO aplica CORS, así que aquí nunca falla.`)
log(`   Si el navegador bloquea las peticiones, el arreglo va en el backend .NET:`)
log(`   la política debe incluir el origen exacto del front (http://localhost:5173 y el dominio desplegado).${c.reset}`)

log(`\n${c.azul}Resumen:${c.reset} ${fallan === 0 ? `${c.verde}todas las rutas del front existen en el servidor.${c.reset}` : `${c.rojo}${fallan} ruta(s) no existen.${c.reset} Corrígelas en ${c.azul}src/services/endpoints.js${c.reset}`}`)
log(`${c.gris}OpenAPI leído de: ${urlSpec}${c.reset}\n`)
