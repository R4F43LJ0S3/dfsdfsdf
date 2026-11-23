// Mapa único de rutas de la API SIFTC (https://siftc.onrender.com).
// Si Backend cambia una ruta, se corrige SOLO aquí: ningún componente escribe rutas a mano.
//
// Confirmadas contra el OpenAPI del servidor desplegado (docs/api/openapi-v1.json).

export const ENDPOINTS = {
  // --- Health ---
  // OJO: health cuelga de la RAIZ del servidor, NO del prefijo /api/v1.
  // Por eso en api.js se pide con URL absoluta y no con el baseURL de axios.
  health: '/health',

  // --- Auth (grupo "Auth") ---
  login: '/auth/login',

  // --- Usuarios (grupo "Usuarios") ---
  // Todas exigen rol Administrador. Confirmadas contra docs/api/openapi-v1.json.
  listarUsuarios: '/usuarios',
  registrarUsuario: '/usuarios/registrar',
  editarUsuario: (id) => `/usuarios/${id}`,
  // DELETE es baja lógica: deja el usuario en estado 'inactivo', no borra la fila.
  eliminarUsuario: (id) => `/usuarios/${id}`,

  // --- Entidades (grupo "Entidades") ---
  entidades: '/entidades',
  entidad: (id) => `/entidades/${id}`,
  ohlc: (id) => `/entidades/${id}/ohlc`,

  // --- Métricas ---
  metricas: '/metricas',

  // --- Ranking (grupo "Ranking") ---
  ranking: '/ranking',

  // --- Parámetros e IC (grupo "Parametros" y "ConfiguracionIC") ---
  parametros: '/parametros',
  actualizarUmbral: '/parametros/actualizar-umbral',
  icConfiguracion: '/ic/configuracion',
  icVersiones: '/ic/configuracion/versiones',

  // --- Diccionario de Datos (grupo "Diccionario") ---
  diccionario: '/diccionario',
  diccionarioTermino: (codigo) => `/diccionario/${encodeURIComponent(codigo)}`,
  diccionarioCargar: '/diccionario/cargar',

  // --- Cargas y Matriz Cruda (grupo "Matriz") ---
  cargas: '/cargas',
  matrizCruda: '/matriz-cruda',

  // --- Aprobaciones (flujo de aprobación de lotes) ---
  aprobaciones: '/aprobaciones',
  aprobarLote: (idLote) => `/aprobaciones/${idLote}/aprobar`,
  rechazarLote: (idLote) => `/aprobaciones/${idLote}/rechazar`,

  // --- Auditoría y Exportación ---
  auditoria: '/auditoria',
  exportar: '/exportar',

  // --- Notificaciones (grupo "Notificaciones") ---
  notificacionesReglas: '/notificaciones/reglas',
  notificacionesRegla: (idRegla) => `/notificaciones/reglas/${idRegla}`,
  notificacionesTokens: '/notificaciones/tokens',
  notificacionesToken: (token) => `/notificaciones/tokens/${encodeURIComponent(token)}`,
  notificacionesEnvios: '/notificaciones/envios',
  notificacionesEventos: '/notificaciones/eventos',

  // --- Tiempo Real (SignalR Hub - HU-BE-04) ---
  hubCotizaciones: '/hubs/cotizaciones',
  emisionesPrueba: '/tiempo-real/emisiones-prueba',

  // --- Watchlist (favoritos y seguimiento personal - Solo Usuario móvil) ---
  watchlist: '/watchlist',
  watchlistEntidad: (idEntidad) => `/watchlist/${idEntidad}`,
}

export default ENDPOINTS
