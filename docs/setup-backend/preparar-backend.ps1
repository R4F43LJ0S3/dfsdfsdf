param(
  [string]$RutaBackend = "..\SIFTC"
)

$raizFront = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$rutaBackDestino = [System.IO.Path]::GetFullPath((Join-Path $raizFront $RutaBackend))

# Si la terminal se abrió antes de instalar Docker Desktop o Git, agrega las rutas estándar de Windows automáticamente
$rutasExtra = @(
  "C:\Program Files\Docker\Docker\resources\bin",
  "C:\Program Files\Git\cmd"
)
foreach ($r in $rutasExtra) {
  if ((Test-Path $r) -and ($env:Path -notlike "*$r*")) {
    $env:Path = "$env:Path;$r"
  }
}

Write-Host "0/5 Verificando que Docker Desktop esté encendido..." -ForegroundColor Cyan
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] Docker Desktop no está instalado en este equipo." -ForegroundColor Red
  Write-Host "Instala Docker Desktop (https://www.docker.com/products/docker-desktop/) y vuelve a ejecutar este comando." -ForegroundColor Yellow
  exit 1
}
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERROR] Docker Desktop no está abierto o aún está iniciando." -ForegroundColor Red
  Write-Host "Abre Docker Desktop, espera a que el ícono esté en verde y vuelve a ejecutar este comando." -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path $rutaBackDestino)) {
  Write-Host "1/5 Clonando automáticamente el repositorio Backend (SIFTC - rama feat_entidades)..." -ForegroundColor Cyan
  git clone -b feat_entidades https://github.com/Jramosd-lang/SIFTC.git "$rutaBackDestino"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] No se pudo clonar https://github.com/Jramosd-lang/SIFTC.git" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "1/5 Repositorio Backend detectado en: $rutaBackDestino" -ForegroundColor Green
}

Write-Host "2/5 Verificando archivo .env y dockerfile del Backend..." -ForegroundColor Cyan
$envDestino = Join-Path $rutaBackDestino ".env"
if (-not (Test-Path $envDestino)) {
  Copy-Item (Join-Path $PSScriptRoot ".env.backend.example") $envDestino -Force
  Write-Host "    Creado $envDestino" -ForegroundColor Green
} else {
  Write-Host "    Ya existe $envDestino" -ForegroundColor Gray
}

$dockerfilePath = Join-Path $rutaBackDestino "dockerfile"
if (Test-Path $dockerfilePath) {
  $contenidoDocker = [System.IO.File]::ReadAllText($dockerfilePath, [System.Text.Encoding]::UTF8)
  if ($contenidoDocker -cmatch "SIFTC\.API\.dll") {
    $contenidoCorregido = $contenidoDocker -creplace "SIFTC\.API\.dll", "SIFTC.Api.dll"
    [System.IO.File]::WriteAllText($dockerfilePath, $contenidoCorregido, [System.Text.UTF8Encoding]::new($false))
    Write-Host "    Ajustado ENTRYPOINT a SIFTC.Api.dll en dockerfile local" -ForegroundColor Green
  } else {
    Write-Host "    dockerfile ya apunta a SIFTC.Api.dll" -ForegroundColor Gray
  }
}

Write-Host "3/5 Levantando contenedores Docker (PostgreSQL 15 + API .NET 10)..." -ForegroundColor Cyan
Push-Location $rutaBackDestino
docker compose up -d --build
$codigoDocker = $LASTEXITCODE
Pop-Location

if ($codigoDocker -ne 0) {
  Write-Host "[ERROR] Falló 'docker compose up -d --build'." -ForegroundColor Red
  exit 1
}

Write-Host "4/5 Esperando a PostgreSQL y cargando usuarios/roles UTF-8 (init-seguridad.sql)..." -ForegroundColor Cyan
$intentos = 0
do {
  Start-Sleep -Seconds 2
  $intentos++
  docker exec siftc_database pg_isready -U postgres -d siftc_db > $null 2>&1
} while ($LASTEXITCODE -ne 0 -and $intentos -lt 25)

$sqlLocal = Join-Path $PSScriptRoot "init-seguridad.sql"
docker cp "$sqlLocal" siftc_database:/tmp/init-seguridad.sql
docker exec siftc_database psql -U postgres -d siftc_db -f /tmp/init-seguridad.sql
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERROR] No se pudo ejecutar init-seguridad.sql en PostgreSQL." -ForegroundColor Red
  exit 1
}

Write-Host "5/5 Configurando .env del Frontend (VITE_USE_MOCK=false)..." -ForegroundColor Cyan
$envFront = Join-Path $raizFront ".env"
$contenidoEnvFront = @"
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:7123
VITE_API_PREFIX=/api/v1
"@
[System.IO.File]::WriteAllText($envFront, $contenidoEnvFront, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host " Entorno Backend + Frontend listo en tu computadora" -ForegroundColor Green
Write-Host " - API .NET 10: http://localhost:7123/api/v1" -ForegroundColor White
Write-Host " - Usuario Analista:      analista@siftc.edu.co | Clave: alza2026" -ForegroundColor White
Write-Host " - Usuario Administrador: admin@siftc.edu.co    | Clave: alza2026" -ForegroundColor White
Write-Host " Ahora ejecuta en frontend-siftc: npm install ; npm run dev" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
