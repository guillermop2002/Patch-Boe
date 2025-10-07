// src/app/api/patches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')
    const fechasEspecificas = searchParams.get('fechasEspecificas')
    const meses = searchParams.get('meses')
    const años = searchParams.get('años')
    const tipoFiltro = searchParams.get('tipoFiltro')
    const categorias = searchParams.get('categorias')
    const subtipos = searchParams.get('subtipos')
    const action = searchParams.get('action')

    const db = getDatabase()

    // Obtener fechas disponibles
    if (action === 'fechas-disponibles') {
      const fechas = db.getAvailableDates()
      return NextResponse.json({ fechas })
    }

    // Obtener categorías disponibles
    if (action === 'categorias-disponibles') {
      const categorias = db.getAvailableCategories()
      return NextResponse.json({ categorias })
    }

    // Obtener subtipos disponibles
    if (action === 'subtipos-disponibles') {
      const subtipos = db.getAvailableSubtypes()
      return NextResponse.json({ subtipos })
    }

    // Búsqueda avanzada
    if (action === 'buscar') {
      const limite = searchParams.get('limite')

      const criterios: any = {
        tipoFiltro: tipoFiltro || 'ambos'
      }

      if (fechasEspecificas) {
        criterios.fechasEspecificas = fechasEspecificas.split(',')
      }
      if (meses) {
        criterios.meses = meses.split(',')
      }
      if (años) {
        criterios.años = años.split(',')
      }
      if (categorias) {
        criterios.categorias = categorias.split(',')
      }
      if (subtipos) {
        criterios.subtipos = subtipos.split(',')
      }

      let patches = db.buscarPatches(criterios)

      // Aplicar límite (por defecto 10)
      const limiteNum = limite ? parseInt(limite) : 10
      if (limiteNum > 0 && limiteNum < 999999) {
        patches = patches.slice(0, limiteNum)
      }

      return NextResponse.json({ patches })
    }

    // Obtener patches por fecha específica
    if (fecha) {
      const patches = db.getPatchesByDate(fecha)
      const stats = db.getStatsByDate(fecha)
      return NextResponse.json({ patches, stats })
    }

    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })

  } catch (error) {
    console.error('Error en API patches:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
