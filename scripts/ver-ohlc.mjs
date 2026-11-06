#!/usr/bin/env node
/**
 * Muestra la respuesta CRUDA de /entidades/{id}/ohlc para ver qué campos trae.
 *   npm run ver:ohlc -- <usuario> <clave> [periodo]
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const archivo of ['.env.local', '.env']) {
  try {
    for (const l of readFileSync(resolve(raiz, archivo), 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* puede no existir */ }
}
const api = `${(env.VITE_API_URL || '').replace(/\/$/, '')}${env.VITE_API_PREFIX ?? '/api/v1'}`
const [usuario, password, periodo = 'mensual'] = process.argv.slice(2)

const r = await fetch(`${api}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario, password }),
})
if (!r.ok) { console.log('login falló:', r.status, (await r.text()).slice(0, 200)); process.exit(1) }
const token = (await r.json()).token
const cab = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

const entidades = await (await fetch(`${api}/entidades`, { headers: cab })).json()
const e = entidades[1] ?? entidades[0]
console.log(`\nEntidad: ${e.nombre} (${e.codigo}) id=${e.id}`)

for (const p of [periodo, 'diario', 'anual']) {
  const res = await fetch(`${api}/entidades/${e.id}/ohlc?periodo=${p}`, { headers: cab })
  const texto = await res.text()
  console.log(`\n=== GET /entidades/{id}/ohlc?periodo=${p} -> ${res.status} ===`)
  if (!res.ok) { console.log(texto.slice(0, 300)); continue }
  const dato = JSON.parse(texto)
  console.log('Claves del objeto:', Object.keys(dato))
  const serie = Object.entries(dato).find(([, v]) => Array.isArray(v))
  if (!serie) { console.log('No hay ningún array adentro. Respuesta completa:'); console.log(JSON.stringify(dato).slice(0, 600)); continue }
  const [nombreSerie, filas] = serie
  console.log(`Serie en la propiedad "${nombreSerie}": ${filas.length} puntos`)
  console.log('Primeros 3 puntos, tal cual llegan:')
  console.log(JSON.stringify(filas.slice(0, 3), null, 2))
}
console.log('')
