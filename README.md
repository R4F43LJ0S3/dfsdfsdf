# ALZA · Portal Web Frontend (SIFTC)

> **Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC)**  
> **Identidad Comercial:** **ALZA** (*Datos trazables. Entidades que cotizan* · *Compara, decide, avanza*)  
> **Equipo Frontend:** Oscar Andrés Hundelshaussen Barreto · Rafael José Barriga Mejía · Sara Belén Alarcano Rincones · Reinel Alfaro Rosado

---

## Requisitos Previos

- **Node.js** `20+` y **npm**
- *(Opcional, solo si deseas conectar con la base de datos y API real)*: **Docker Desktop** encendido

---

## Cómo ejecutar el proyecto en tu computadora

### Opción A — Modo Rápido (Sin Docker ni Backend, en 1 minuto)

Ideal para revisar diseño, responsive, gráficas, ranking, modo claro/oscuro y validaciones de seguridad sin instalar contenedores:

```powershell
# 1. Descargar la versión unificada de la rama Oscar
git fetch origin
git checkout Oscar
git pull origin Oscar

# 2. Instalar dependencias
npm install

# 3. Asegurar modo simulado (si no tienes archivo .env, usa mock por defecto)
Copy-Item .env.example .env -Force

# 4. Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev
```
En este modo puedes ingresar con cualquier correo/usuario válido (ej. `analista@siftc.edu.co` o `analista`) y cualquier contraseña válida de 6 a 64 caracteres (ej. `alza2026`).

---

### Opción B — Modo Completo con Backend Real (`.NET 10` + `PostgreSQL 15` en Docker)

Mientras el equipo de Backend incorpora en su repositorio los ajustes reportados en Docker (`SIFTC.Api.dll`) y el script de semilla UTF-8, incluimos un asistente automático en `docs/setup-backend/` para que cualquier compañero levante todo con un solo comando sin tocar código C#:

#### Paso 1: Descargar la rama `Oscar` en `frontend-siftc`
```powershell
git fetch origin
git checkout Oscar
git pull origin Oscar
```

#### Paso 2: Ejecutar el script automático de preparación (con Docker Desktop abierto)
```powershell
powershell -ExecutionPolicy Bypass -File .\docs\setup-backend\preparar-backend.ps1
```
*(Si aún no tienes clonado `SIFTC`, el script lo clona automáticamente en `..\SIFTC`, crea `..\SIFTC\.env`, ajusta localmente `SIFTC.Api.dll` en el `dockerfile`, levanta los contenedores `siftc_database` y `siftc_api_csharp`, carga los roles y usuarios en UTF-8 puro y configura `.env` del frontend con `VITE_USE_MOCK=false`).*

#### Paso 3: Iniciar el Frontend
```powershell
npm install
npm run dev
```

#### Credenciales reales cargadas en PostgreSQL
| Rol | Correo / Usuario | Contraseña | Nombre en BD |
| :--- | :--- | :--- | :--- |
| **Analista financiero** | `analista@siftc.edu.co` *(o `analista`)* | `alza2026` | Juan Pérez |
| **Administrador** | `admin@siftc.edu.co` *(o `admin`)* | `alza2026` | Oscar Administrador |

---

## Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Levanta el servidor local de Vite con HMR en `http://localhost:5173`. |
| `npm run lint` | Ejecuta validación estática ESLint sobre todo el proyecto. |
| `npm run build` | Genera el empaquetado optimizado de producción en `dist/`. |
| `npm run preview` | Sirve localmente el empaquetado de producción compilado. |

---

## Documentación Técnica del Repositorio

- [`DOC_PROYECTO_FRONTEND.md`](./DOC_PROYECTO_FRONTEND.md): Contexto funcional, alcance de Sprints y arquitectura.
- [`DICCIONARIO_DATOS_FRONTEND.md`](./DICCIONARIO_DATOS_FRONTEND.md): Contrato de las 15 columnas CSV y 10 métricas núcleo.
- [`MANUAL_MARCA_ALZA.md`](./MANUAL_MARCA_ALZA.md): Paleta cromática, tipografía y reglas de accesibilidad visual.
- [`UNIFICACION_DISCREPANCIAS_EQUIPO.md`](./UNIFICACION_DISCREPANCIAS_EQUIPO.md): Integración de los aportes de Rafael, Reynel, Belén y Oscar.
- [`SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md`](./SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md): Estándares OWASP, RFC 5322, UTF-8, tope de 10 intentos y validaciones en tiempo real.
