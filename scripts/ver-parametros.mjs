#!/usr/bin/env node
/**
 * Muestra los parámetros que acepta cada endpoint y, si están definidos,
 * los VALORES permitidos (enum). Sirve para saber qué mandar en 'periodo',
 * 'dimension', 'orden', etc. sin adivinar.
 *
 *   npm run ver:parametros
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const c = { reset: '\x1b[0m', verde: '\x1b[32m', amarillo: '\x1b[33m', azul: '\x1b[36m', gris: '\x1b[90m' }
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
const base = (env.VITE_API_URL || '').replace(/\/$/, '')

const res = await fetch(`${base}/openapi/v1.json`)
const spec = await res.json()

function resolver(e, vistos = new Set()) {
  if (!e) return null
  if (e.$ref) {
    const n = e.$ref.split('/').pop()
    if (vistos.has(n)) return null
    vistos.add(n)
    return resolver(spec.components?.schemas?.[n], vistos)
  }
  return e
}

// Un enum puede venir directo, dentro de allOf/oneOf/anyOf, o en items (arrays)
function valores(esquema) {
  const e = resolver(esquema)
  if (!e) return null
  if (e.enum) return e.enum
  for (const clave of ['allOf', 'oneOf', 'anyOf']) {
    for (const sub of e[clave] ?? []) {
      const v = valores(sub)
      if (v) return v
    }
  }
  if (e.items) return valores(e.items)
  return null
}

log(`\n${c.azul}=== Parámetros y valores permitidos ===${c.reset}`)
for (const [ruta, metodos] of Object.entries(spec.paths)) {
  for (const [metodo, def] of Object.entries(metodos)) {
    const params = def.parameters ?? []
    if (params.length === 0) continue
    log(`\n${c.verde}${metodo.toUpperCase()} ${ruta}${c.reset}`)
    for (const p of params) {
      const v = valores(p.schema)
      const e = resolver(p.schema)
      const tipo = e?.type ?? '?'
      const def2 = e?.default !== undefined ? ` (por defecto: ${JSON.stringify(e.default)})` : ''
      if (v) log(`   ${c.amarillo}${p.name}${p.required ? '*' : ''}${c.reset}: ${JSON.stringify(v)}${def2}`)
      else log(`   ${p.name}${p.required ? '*' : ''}: ${tipo}${def2}${c.gris}  (sin lista de valores en el contrato)${c.reset}`)
    }
  }
}

// Enums sueltos declarados en el contrato (ahí suelen estar los periodos y dimensiones)
const enums = Object.entries(spec.components?.schemas ?? {}).filter(([, e]) => e.enum)
if (enums.length) {
  log(`\n${c.azul}=== Listas de valores declaradas en el contrato ===${c.reset}`)
  for (const [nombre, e] of enums) log(`   ${c.amarillo}${nombre}${c.reset}: ${JSON.stringify(e.enum)}`)
}
log('')
