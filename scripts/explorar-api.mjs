#!/usr/bin/env node
/**
 * Lee el contrato REAL de la API SIFTC desde su OpenAPI y, si le das credenciales,
 * prueba el login con los nombres de campo que el servidor realmente espera.
 *
 *   npm run explorar:api                      -> sólo contrato (no necesita clave)
 *   npm run explorar:api -- usuario clave     -> además prueba login y endpoints
 *
 * La contraseña no se guarda ni se imprime.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const env = leerEnv()
const base = (env.VITE_API_URL || 'https://siftc.onrender.com').replace(/\/$/, '')
const prefijo = env.VITE_API_PREFIX ?? '/api/v1'
const api = `${base}${prefijo}`
const [identificador, password] = process.argv.slice(2)

async function pedir(url, opciones = {}, ms = 90000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { ...opciones, signal: ctrl.signal })
    const texto = await res.text()
    let dato = null
    try { dato = JSON.parse(texto) } catch { dato = texto.slice(0, 300) }
    return { ok: res.ok, status: res.status, dato }
  } catch (err) {
    return { ok: false, status: 0, error: err.message }
  } finally { clearTimeout(t) }
}

log(`\n${c.azul}=== Contrato real de ${api} ===${c.reset}`)

const spec = (await pedir(`${base}/openapi/v1.json`)).dato
if (!spec?.paths) { log(`${c.rojo}x No se pudo leer el OpenAPI.${c.reset}`); process.exit(1) }

// Resuelve $ref y aplana un esquema a "campo: tipo"
function resolver(esquema, vistos = new Set()) {
  if (!esquema) return null
  if (esquema.$ref) {
    const nombre = esquema.$ref.split('/').pop()
    if (vistos.has(nombre)) return { tipo: nombre + ' (recursivo)' }
    vistos.add(nombre)
    return resolver(spec.components?.schemas?.[nombre], vistos)
  }
  return esquema
}

function describir(esquema, nivel = 0, vistos = new Set()) {
  const e = resolver(esquema, vistos)
  if (!e) return '?'
  const sangria = '  '.repeat(nivel + 1)
  if (e.type === 'array') return `array de:\n${sangria}${describir(e.items, nivel + 1, vistos)}`
  if (e.properties) {
    const req = new Set(e.required ?? [])
    const campos = Object.entries(e.properties).map(([k, v]) => {
      const r = resolver(v, new Set(vistos))
      const tipo = r?.type === 'array' ? `array(${resolver(r.items, new Set(vistos))?.type ?? '?'})` : (r?.type ?? '?')
      const fmt = r?.format ? ` <${r.format}>` : ''
      if (r?.properties) return `${sangria}${k}${req.has(k) ? '*' : ''}: ${describir(v, nivel + 1, new Set(vistos))}`
      return `${sangria}${k}${req.has(k) ? '*' : ''}: ${tipo}${fmt}`
    })
    return `{\n${campos.join('\n')}\n${'  '.repeat(nivel)}}`
  }
  return e.type ?? '?'
}

// --- Contrato del login --------------------------------------------------------
const rutaLogin = `${prefijo}/auth/login`
const login = spec.paths[rutaLogin]?.post
const esquemaEntrada = login?.requestBody?.content?.['application/json']?.schema

log(`\n${c.azul}1) POST ${rutaLogin} — lo que el servidor ESPERA recibir:${c.reset}`)
log(describir(esquemaEntrada))
log(`${c.gris}   (* = obligatorio)${c.reset}`)

const propsEntrada = Object.keys(resolver(esquemaEntrada)?.properties ?? {})
const campoUsuario = propsEntrada.find((p) => !/password|clave|contrase/i.test(p))
const campoClave = propsEntrada.find((p) => /password|clave|contrase/i.test(p))
log(`${c.amarillo}   -> El front debe enviar: { ${campoUsuario}, ${campoClave} }${c.reset}`)

const esquemaSalida = login?.responses?.['200']?.content?.['application/json']?.schema
log(`\n${c.azul}2) POST ${rutaLogin} — lo que DEVUELVE:${c.reset}`)
log(describir(esquemaSalida))

// --- Contrato de los endpoints de datos ---------------------------------------
log(`\n${c.azul}3) Respuestas de los endpoints de datos:${c.reset}`)
for (const ruta of Object.keys(spec.paths)) {
  if (ruta === rutaLogin) continue
  const get = spec.paths[ruta].get
  if (!get) continue
  const esquema = get.responses?.['200']?.content?.['application/json']?.schema
  if (!esquema) continue
  log(`\n${c.verde}GET ${ruta}${c.reset}`)
  const params = (get.parameters ?? []).map((p) => `${p.name}${p.required ? '*' : ''}`)
  if (params.length) log(`${c.gris}  parámetros: ${params.join(', ')}${c.reset}`)
  log(describir(esquema))
}

// --- Prueba real de login ------------------------------------------------------
if (identificador && password && campoUsuario && campoClave) {
  log(`\n${c.azul}4) Probando login real con { ${campoUsuario} }...${c.reset}`)
  const r = await pedir(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ [campoUsuario]: identificador, [campoClave]: password }),
  })
  if (r.ok) {
    const token = r.dato?.token ?? r.dato?.accessToken
    log(`${c.verde}OK login ${r.status}. Campos recibidos: ${Object.keys(r.dato ?? {}).join(', ')}${c.reset}`)
    if (token) {
      const ent = await pedir(`${api}/entidades`, { headers: { Authorization: `Bearer ${token}` } })
      log(`${c.verde}OK /entidades -> ${ent.status}, ${Array.isArray(ent.dato) ? ent.dato.length + ' registros' : 'respuesta no-array'}${c.reset}`)
    }
  } else {
    log(`${c.rojo}x login ${r.status}: ${JSON.stringify(r.dato).slice(0, 300)}${c.reset}`)
  }
} else if (!identificador) {
  log(`\n${c.gris}4) Sin credenciales: no se probó el login. Para probarlo:`)
  log(`   npm run explorar:api -- <${campoUsuario ?? 'usuario'}> <clave>${c.reset}`)
}

log('')
