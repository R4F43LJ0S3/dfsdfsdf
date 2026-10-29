const base = [
  ['ENT001', 'Entidad Alfa', 'Energía', 82.1, 2.11],
  ['ENT002', 'Entidad Beta', 'Finanzas', 78.5, 1.55],
  ['ENT003', 'Entidad Gamma', 'Tecnología', 74.9, 1.22],
  ['ENT004', 'Entidad Delta', 'Salud', 70.2, 0.43],
  ['ENT005', 'Entidad Épsilon', 'Comercio', 66.9, 0.15],
  ['ENT006', 'Entidad Zeta', 'Transporte', 63.4, -0.16],
  ['ENT007', 'Entidad Eta', 'Energía', 61.0, -1.29],
  ['ENT008', 'Entidad Theta', 'Finanzas', 55.8, -0.89],
  ['ENT009', 'Entidad Iota', 'Salud', 49.3, -0.6],
  ['ENT010', 'Entidad Kappa', 'Comercio', 44.0, -0.45],
]

export const entidades = base.map(([codigo_entidad, nombre_entidad, sector, indice_competitividad, variacion_porcentual]) => ({
  codigo_entidad,
  nombre_entidad,
  sector,
  periodo: '2026-09',
  indice_competitividad,
  variacion_porcentual,
  direccion: variacion_porcentual > 0 ? 'UP' : variacion_porcentual < 0 ? 'DOWN' : 'EQUAL',
}))

export const indiceGeneral = {
  valor: 64.3, variacion: -0.62, puntos: -0.4,
  apertura: 64.7, maximo: 65.1, minimo: 63.9, cierre: 64.3,
  fecha: '2026-10-07',
  serie: [61.8,62.2,61.9,62.7,63.3,63.1,63.9,64.4,64.1,63.7,64.4,64.9,65.1,64.8,64.2,
          63.7,64.1,64.8,65.2,65.6,65.9,65.5,65.1,65.7,66.0,65.8,65.2,64.9,64.6,64.3],
}