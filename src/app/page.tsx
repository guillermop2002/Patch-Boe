'use client'

import React, { useState, useEffect } from 'react'
import { PatchEntry, getPatchesByFecha, getFechasDisponibles, buscarPatches } from '@/lib/api-client'
import { getFechaHoy, formatearFecha } from '@/lib/fechas'
import BuscadorAvanzado, { CriteriosBusqueda } from '@/components/BuscadorAvanzado'
import { CategoriaBadge } from '@/lib/categorias'

export default function Home() {
  const [patchesHoy, setPatchesHoy] = useState<PatchEntry[]>([])
  const [patchesBusqueda, setPatchesBusqueda] = useState<PatchEntry[]>([])
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([])
  const [mostrandoBusqueda, setMostrandoBusqueda] = useState(false)
  const [loading, setLoading] = useState(true)

  const fechaHoy = getFechaHoy()
  const fechaHoyFormateada = formatearFecha(fechaHoy)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      // Cargar patches de hoy
      const { patches: patchesDeHoy } = await getPatchesByFecha(fechaHoy)
      setPatchesHoy(patchesDeHoy)

      // Cargar fechas disponibles
      const fechas = await getFechasDisponibles()
      setFechasDisponibles(fechas)

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBusqueda = async (criterios: CriteriosBusqueda) => {
    try {
      const resultados = await buscarPatches({
        fechasEspecificas: criterios.fechasEspecificas,
        meses: criterios.meses,
        años: criterios.años,
        tipoFiltro: criterios.tipoFiltro,
        categorias: criterios.categorias,
        limite: criterios.limite
      })

      setPatchesBusqueda(resultados)
      setMostrandoBusqueda(true)
    } catch (error) {
      console.error('Error en búsqueda:', error)
    }
  }

  const volverAHoy = () => {
    setMostrandoBusqueda(false)
    setPatchesBusqueda([])
  }

  const renderPatch = (patch: PatchEntry) => {
    const isBuff = patch.tipo === 'buff'

    return (
      <article key={`${patch.id}-${patch.fecha}`} className="patch-card">
        {/* Header con badges */}
        <div className="patch-header">
          <div className="patch-content">
            <div className="patch-badges">
              <span className={`patch-badge ${isBuff ? 'patch-badge-buff' : 'patch-badge-nerf'}`}>
                {isBuff ? '🔼 BUFF' : '🔽 NERF'}
              </span>
              <span className="patch-relevance">
                Relevancia: {patch.relevance}/100
              </span>
              <CategoriaBadge categoriaId={patch.categoria} className="ml-2" />
            </div>
            <div className="patch-meta">
              <span className="patch-date">📅 {formatearFecha(patch.fecha)}</span>
            </div>
          </div>
        </div>

        {/* Título */}
        <h2 className="patch-title">{patch.titulo}</h2>

        {/* Resumen */}
        <p className="text-gray-600 text-sm mb-3">{patch.summary}</p>

        {/* ID como enlace al BOE */}
        <div className="text-right">
          <a
            href={`https://www.boe.es/diario_boe/txt.php?id=${patch.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="patch-link text-xs font-mono"
            title={`Ver ${patch.id} en BOE oficial`}
          >
            📄 {patch.id}
          </a>
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <main className="container">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Cargando datos...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      {/* Navegación */}
      <div className="text-center mb-6">
        <a
          href="/acerca"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          ℹ️ Acerca del proyecto
        </a>
      </div>

      <h1 className="main-title">
        🇪🇸 Patch Legislativo
      </h1>

      <p className="main-subtitle">
        Descubre los cambios normativos del BOE como si fueran parches de videojuegos
      </p>

      {/* Buscador Avanzado */}
      <BuscadorAvanzado
        onBuscar={handleBusqueda}
        fechasDisponibles={fechasDisponibles}
      />

      {/* Resultados */}
      {mostrandoBusqueda ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              📊 Resultados de búsqueda ({patchesBusqueda.length})
            </h2>
            <button
              onClick={volverAHoy}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Volver a hoy
            </button>
          </div>

          {patchesBusqueda.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p className="empty-title">No se encontraron resultados</p>
              <p className="empty-subtitle">Intenta con otros criterios de búsqueda</p>
            </div>
          ) : (
            <div className="patches-list">
              {patchesBusqueda.map(renderPatch)}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-center mb-6">
            �� Parches de hoy — {fechaHoyFormateada}
          </h2>

          {patchesHoy.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-title">No hay parches para hoy</p>
              <p className="empty-subtitle">
                Utiliza el buscador para explorar fechas anteriores
              </p>
            </div>
          ) : (
            <div>
              {/* Estadísticas */}
              <div className="text-center mb-6">
                <div className="inline-flex gap-4 bg-gray-100 rounded-lg px-4 py-2">
                  <span className="text-green-600 font-semibold">
                    🔼 {patchesHoy.filter(p => p.tipo === 'buff').length} BUFFS
                  </span>
                  <span className="text-red-600 font-semibold">
                    🔽 {patchesHoy.filter(p => p.tipo === 'nerf').length} NERFS
                  </span>
                  <span className="text-gray-600">📊 {patchesHoy.length} total</span>
                </div>
              </div>

              <div className="patches-list">
                {patchesHoy.map(renderPatch)}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
