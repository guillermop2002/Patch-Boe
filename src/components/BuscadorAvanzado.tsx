'use client'

import React, { useState } from 'react'
import { formatearFecha, fechaAFormatoBD, esFechaValida } from '@/lib/fechas'
import { categoriasDisponibles, getCategoriaColors } from '@/lib/categorias'

interface BuscadorProps {
  onBuscar: (criterios: CriteriosBusqueda) => void
  fechasDisponibles: string[]
}

export interface CriteriosBusqueda {
  fechasEspecificas?: string[]
  meses?: string[] // YYYYMM
  años?: string[] // YYYY
  tipoFiltro?: 'buff' | 'nerf' | 'ambos'
  categorias?: string[] // Categorías seleccionadas
  limite?: number // Número máximo de resultados
}

export default function BuscadorAvanzado({ onBuscar, fechasDisponibles }: BuscadorProps) {
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<string[]>([])
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([])
  const [añosSeleccionados, setAñosSeleccionados] = useState<string[]>([])
  const [tipoFiltro, setTipoFiltro] = useState<'buff' | 'nerf' | 'ambos'>('ambos')
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([])
  const [fechaInput, setFechaInput] = useState('')
  const [mesInput, setMesInput] = useState('')
  const [añoInput, setAñoInput] = useState('')
  const [limite, setLimite] = useState(10)


  // Obtener años y meses únicos de las fechas disponibles
  const añosDisponibles = [...new Set(fechasDisponibles.map(f => f.substring(0, 4)))].sort()
  const mesesDisponibles = [...new Set(fechasDisponibles.map(f => f.substring(0, 6)))].sort()

  const agregarFecha = () => {
    if (fechaInput.trim()) {
      const fechaBD = fechaAFormatoBD(fechaInput.trim())
      if (esFechaValida(fechaBD) && !fechasSeleccionadas.includes(fechaBD)) {
        setFechasSeleccionadas([...fechasSeleccionadas, fechaBD])
        setFechaInput('')
      }
    }
  }

  const agregarMes = () => {
    if (mesInput.trim() && mesInput.length === 7) { // MM/YYYY
      const [mes, año] = mesInput.split('/')
      const mesBD = `${año}${mes.padStart(2, '0')}`
      if (!mesesSeleccionados.includes(mesBD)) {
        setMesesSeleccionados([...mesesSeleccionados, mesBD])
        setMesInput('')
      }
    }
  }

  const agregarAño = () => {
    if (añoInput.trim() && añoInput.length === 4) {
      if (!añosSeleccionados.includes(añoInput.trim())) {
        setAñosSeleccionados([...añosSeleccionados, añoInput.trim()])
        setAñoInput('')
      }
    }
  }

  const eliminarFecha = (fecha: string) => {
    setFechasSeleccionadas(fechasSeleccionadas.filter(f => f !== fecha))
  }

  const eliminarMes = (mes: string) => {
    setMesesSeleccionados(mesesSeleccionados.filter(m => m !== mes))
  }

  const eliminarAño = (año: string) => {
    setAñosSeleccionados(añosSeleccionados.filter(a => a !== año))
  }

  const toggleCategoria = (categoriaId: string) => {
    if (categoriasSeleccionadas.includes(categoriaId)) {
      setCategoriasSeleccionadas(categoriasSeleccionadas.filter(c => c !== categoriaId))
    } else {
      setCategoriasSeleccionadas([...categoriasSeleccionadas, categoriaId])
    }
  }

  const formatearMes = (mesBD: string) => {
    if (mesBD.length !== 6) return mesBD
    const año = mesBD.substring(0, 4)
    const mes = mesBD.substring(4, 6)
    return `${mes}/${año}`
  }

  const ejecutarBusqueda = () => {
    const criterios: CriteriosBusqueda = {
      fechasEspecificas: fechasSeleccionadas,
      meses: mesesSeleccionados,
      años: añosSeleccionados,
      tipoFiltro,
      categorias: categoriasSeleccionadas,
      limite
    }
    onBuscar(criterios)
  }

  const limpiarTodo = () => {
    setFechasSeleccionadas([])
    setMesesSeleccionados([])
    setAñosSeleccionados([])
    setCategoriasSeleccionadas([])
    setTipoFiltro('ambos')
    setLimite(10)
    setFechaInput('')
    setMesInput('')
    setAñoInput('')
  }

  return (
    <div className="search-card">
      <div className="text-center mb-6">
        <h2 className="search-title">Buscador de Parches</h2>
        <p className="search-subtitle">Encuentra cambios normativos por fecha y tipo</p>
      </div>

      {/* Filtros en una sola fila */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Tipo */}
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="form-select"
          >
            <option value="ambos">🔄 Ambos</option>
            <option value="buff">🔼 Solo BUFFS</option>
            <option value="nerf">🔽 Solo NERFS</option>
          </select>
        </div>

        {/* Límite */}
        <div className="form-group">
          <label className="form-label">Resultados</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={limite === 999999 ? '' : limite}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 10
                setLimite(val > 0 ? val : 10)
              }}
              placeholder="10"
              min="1"
              max="1000"
              className="form-input flex-1"
            />
            <button
              onClick={() => setLimite(999999)}
              className={`btn ${limite === 999999 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Fecha específica */}
        <div className="form-group">
          <label className="form-label">Fecha específica</label>
          <div className="flex">
            <input
              type="text"
              value={fechaInput}
              onChange={(e) => setFechaInput(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="form-input flex-1 rounded-r-none"
              onKeyPress={(e) => e.key === 'Enter' && agregarFecha()}
            />
            <button
              onClick={agregarFecha}
              className="btn btn-primary rounded-l-none"
              style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}
            >
              +
            </button>
          </div>
        </div>

        {/* Mes */}
        <div className="form-group">
          <label className="form-label">Mes completo</label>
          <div className="flex">
            <input
              type="text"
              value={mesInput}
              onChange={(e) => setMesInput(e.target.value)}
              placeholder="MM/YYYY"
              className="form-input flex-1 rounded-r-none"
              onKeyPress={(e) => e.key === 'Enter' && agregarMes()}
            />
            <button
              onClick={agregarMes}
              className="btn btn-primary rounded-l-none"
              style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Segunda fila para año */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="form-group">
          <label className="form-label">Año completo</label>
          <div className="flex">
            <input
              type="text"
              value={añoInput}
              onChange={(e) => setAñoInput(e.target.value)}
              placeholder="YYYY"
              className="form-input flex-1 rounded-r-none"
              onKeyPress={(e) => e.key === 'Enter' && agregarAño()}
            />
            <button
              onClick={agregarAño}
              className="btn btn-primary rounded-l-none"
              style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
            >
              +
            </button>
          </div>
        </div>
        <div className="md:col-span-3"></div>
      </div>

      {/* Sección de categorías */}
      <div className="mb-6">
        <label className="form-label">Categorías</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {categoriasDisponibles.map(categoria => {
            const isSelected = categoriasSeleccionadas.includes(categoria.id)
            
            // Mapeo de colores para estilos inline
            const colorMap: { [key: string]: { bg: string; text: string; border: string; hover: string } } = {
              'blue': { bg: '#3b82f6', text: '#1e40af', border: '#93c5fd', hover: '#dbeafe' },
              'indigo': { bg: '#6366f1', text: '#3730a3', border: '#a5b4fc', hover: '#e0e7ff' },
              'purple': { bg: '#8b5cf6', text: '#7c3aed', border: '#c4b5fd', hover: '#f3e8ff' },
              'pink': { bg: '#ec4899', text: '#be185d', border: '#f9a8d4', hover: '#fce7f3' },
              'red': { bg: '#ef4444', text: '#991b1b', border: '#fca5a5', hover: '#fee2e2' },
              'orange': { bg: '#f97316', text: '#9a3412', border: '#fb923c', hover: '#fed7aa' },
              'yellow': { bg: '#eab308', text: '#92400e', border: '#fbbf24', hover: '#fef3c7' },
              'green': { bg: '#22c55e', text: '#166534', border: '#86efac', hover: '#dcfce7' },
              'teal': { bg: '#14b8a6', text: '#115e59', border: '#5eead4', hover: '#ccfbf1' },
              'cyan': { bg: '#06b6d4', text: '#155e75', border: '#67e8f9', hover: '#cffafe' },
              'sky': { bg: '#0ea5e9', text: '#0c4a6e', border: '#7dd3fc', hover: '#e0f2fe' },
              'rose': { bg: '#f43f5e', text: '#881337', border: '#fda4af', hover: '#ffe4e6' },
              'violet': { bg: '#8b5cf6', text: '#5b21b6', border: '#a78bfa', hover: '#ede9fe' },
              'emerald': { bg: '#10b981', text: '#065f46', border: '#6ee7b7', hover: '#d1fae5' },
              'amber': { bg: '#f59e0b', text: '#92400e', border: '#fbbf24', hover: '#fef3c7' },
              'lime': { bg: '#84cc16', text: '#365314', border: '#bef264', hover: '#ecfccb' },
              'slate': { bg: '#64748b', text: '#334155', border: '#94a3b8', hover: '#f1f5f9' },
              'gray': { bg: '#6b7280', text: '#374151', border: '#d1d5db', hover: '#f9fafb' },
              'neutral': { bg: '#737373', text: '#404040', border: '#d4d4d4', hover: '#fafafa' }
            };
            
            const colorKey = categoria.color.replace('bg-', '').replace('-500', '').replace('-600', '');
            const colors = colorMap[colorKey] || colorMap['gray'];
            
            return (
              <button
                key={categoria.id}
                onClick={() => toggleCategoria(categoria.id)}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.5rem',
                  border: '2px solid',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  background: isSelected ? colors.bg : 'white',
                  color: isSelected ? 'white' : colors.text,
                  borderColor: isSelected ? 'transparent' : colors.border,
                  boxShadow: isSelected ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = colors.hover;
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {categoria.nombre}
              </button>
            )
          })}
        </div>
        {categoriasSeleccionadas.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            {categoriasSeleccionadas.length} categoría{categoriasSeleccionadas.length > 1 ? 's' : ''} seleccionada{categoriasSeleccionadas.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Chips seleccionados */}
      {(fechasSeleccionadas.length > 0 || mesesSeleccionados.length > 0 || añosSeleccionados.length > 0 || categoriasSeleccionadas.length > 0) && (
        <div className="active-filters">
          <div className="active-filters-header">
            <h3 className="active-filters-title">Filtros activos:</h3>
            <button onClick={limpiarTodo} className="clear-all-btn">
              Limpiar todo
            </button>
          </div>
          <div className="filter-tags">
            {fechasSeleccionadas.map(fecha => (
              <span key={fecha} className="filter-tag">
                📅 {formatearFecha(fecha)}
                <button
                  onClick={() => eliminarFecha(fecha)}
                  className="filter-tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
            {mesesSeleccionados.map(mes => (
              <span key={mes} className="filter-tag">
                📆 {formatearMes(mes)}
                <button
                  onClick={() => eliminarMes(mes)}
                  className="filter-tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
            {añosSeleccionados.map(año => (
              <span key={año} className="filter-tag">
                🗓️ {año}
                <button
                  onClick={() => eliminarAño(año)}
                  className="filter-tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
            {categoriasSeleccionadas.map(categoriaId => {
              const categoria = getCategoriaColors(categoriaId)
              return (
                <span key={categoriaId} className="filter-tag">
                  🏷️ {categoria.nombre}
                  <button
                    onClick={() => toggleCategoria(categoriaId)}
                    className="filter-tag-remove"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="btn-group">
        <button
          onClick={ejecutarBusqueda}
          className="btn btn-primary"
        >
          🔍 Buscar
        </button>
        <button
          onClick={limpiarTodo}
          className="btn btn-secondary"
        >
          🧹 Limpiar
        </button>
      </div>
    </div>
  )
}
