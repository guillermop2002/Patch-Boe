// src/lib/api-client.ts
// Cliente para llamar a las APIs desde el frontend

export interface PatchEntry {
  id: string;
  fecha: string;
  titulo: string;
  tipo: 'buff' | 'nerf';
  categoria: string;
  summary: string;
  relevance: number;
  contenido: string;
  created_at: string;
}

export interface PatchStats {
  buffs: number;
  nerfs: number;
  total: number;
}

export interface CriteriosBusqueda {
  fechasEspecificas?: string[]
  meses?: string[] // YYYYMM
  años?: string[] // YYYY
  tipoFiltro?: 'buff' | 'nerf' | 'ambos'
  categorias?: string[]
  limite?: number
}

// Obtener patches por fecha
export async function getPatchesByFecha(fecha: string): Promise<{ patches: PatchEntry[], stats: PatchStats }> {
  const response = await fetch(`/api/patches?fecha=${fecha}`)
  if (!response.ok) {
    throw new Error('Error obteniendo patches')
  }
  return response.json()
}

// Obtener fechas disponibles
export async function getFechasDisponibles(): Promise<string[]> {
  const response = await fetch('/api/patches?action=fechas-disponibles')
  if (!response.ok) {
    throw new Error('Error obteniendo fechas disponibles')
  }
  const data = await response.json()
  return data.fechas
}

// Búsqueda avanzada
export async function buscarPatches(criterios: CriteriosBusqueda): Promise<PatchEntry[]> {
  const params = new URLSearchParams()
  params.append('action', 'buscar')

  if (criterios.tipoFiltro) {
    params.append('tipoFiltro', criterios.tipoFiltro)
  }

  // Siempre enviar límite, por defecto 10
  const limite = criterios.limite || 10
  params.append('limite', limite.toString())

  if (criterios.fechasEspecificas && criterios.fechasEspecificas.length > 0) {
    params.append('fechasEspecificas', criterios.fechasEspecificas.join(','))
  }

  if (criterios.meses && criterios.meses.length > 0) {
    params.append('meses', criterios.meses.join(','))
  }

  if (criterios.años && criterios.años.length > 0) {
    params.append('años', criterios.años.join(','))
  }

  if (criterios.categorias && criterios.categorias.length > 0) {
    params.append('categorias', criterios.categorias.join(','))
  }

  const response = await fetch(`/api/patches?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Error en búsqueda')
  }

  const data = await response.json()
  return data.patches
}
