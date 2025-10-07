'use client'

import React, { useState } from 'react'
import { formatearFecha, fechaAFormatoBD, esFechaValida } from '@/lib/fechas'

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

  // Lista de categorías disponibles
  const categoriasDisponibles = [
    'NormasYDisposiciones',
    'DisposicionesAdministrativas',
    'ActosIndividuales',
    'AnunciosEdictosNotificaciones',
    'ContratacionPublica',
    'ConvocatoriasEmpleoPublico',
    'SubvencionesAyudas',
    'FiscalidadPresupuestos',
    'RegistrosPropiedadMercantil',
    'Jurisprudencia',
    'NormativaInternacionalUE',
    'CorreccionesRectificaciones',
    'InformesEstadisticas',
    'TransparenciaFiscalizacion',
    'ConcursosYProcedimientos',
    'SectorialesTecnicos',
    'ComunicadosInstitucionales',
    'PublicidadLegal',
    'MedidasEmergencia',
    'Otros'
  ]

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

  const toggleCategoria = (categoria: string) => {
    if (categoriasSeleccionadas.includes(categoria)) {
      setCategoriasSeleccionadas(categoriasSeleccionadas.filter(c => c !== categoria))
    } else {
      setCategoriasSeleccionadas([...categoriasSeleccionadas, categoria])
    }
  }

  const formatearCategoria = (categoria: string) => {
    return categoria.replace(/([A-Z])/g, ' $1').trim()
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Buscador de Parches</h2>
        <p className="text-gray-500 text-sm">Encuentra cambios normativos por fecha y tipo</p>
      </div>

      {/* Filtros en una sola fila */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="ambos">🔄 Ambos</option>
            <option value="buff">🔼 Solo BUFFS</option>
            <option value="nerf">🔽 Solo NERFS</option>
          </select>
        </div>

        {/* Límite */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resultados</label>
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              onClick={() => setLimite(999999)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                limite === 999999
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Fecha específica */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha específica</label>
          <div className="flex">
            <input
              type="text"
              value={fechaInput}
              onChange={(e) => setFechaInput(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && agregarFecha()}
            />
            <button
              onClick={agregarFecha}
              className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Mes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mes completo</label>
          <div className="flex">
            <input
              type="text"
              value={mesInput}
              onChange={(e) => setMesInput(e.target.value)}
              placeholder="MM/YYYY"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && agregarMes()}
            />
            <button
              onClick={agregarMes}
              className="px-3 py-2 bg-green-500 text-white rounded-r-md hover:bg-green-600 text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Segunda fila para año */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Año completo</label>
          <div className="flex">
            <input
              type="text"
              value={añoInput}
              onChange={(e) => setAñoInput(e.target.value)}
              placeholder="YYYY"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && agregarAño()}
            />
            <button
              onClick={agregarAño}
              className="px-3 py-2 bg-purple-500 text-white rounded-r-md hover:bg-purple-600 text-sm"
            >
              +
            </button>
          </div>
        </div>
        <div className="md:col-span-3"></div>
      </div>

      {/* Sección de categorías */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Categorías</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {categoriasDisponibles.map(categoria => (
            <button
              key={categoria}
              onClick={() => toggleCategoria(categoria)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                categoriasSeleccionadas.includes(categoria)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50 hover:border-orange-300'
              }`}
            >
              {formatearCategoria(categoria)}
            </button>
          ))}
        </div>
        {categoriasSeleccionadas.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            {categoriasSeleccionadas.length} categoría{categoriasSeleccionadas.length > 1 ? 's' : ''} seleccionada{categoriasSeleccionadas.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Chips seleccionados */}
      {(fechasSeleccionadas.length > 0 || mesesSeleccionados.length > 0 || añosSeleccionados.length > 0 || categoriasSeleccionadas.length > 0) && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filtros activos:</h3>
          <div className="flex flex-wrap gap-2">
            {fechasSeleccionadas.map(fecha => (
              <span key={fecha} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                📅 {formatearFecha(fecha)}
                <button
                  onClick={() => eliminarFecha(fecha)}
                  className="text-blue-600 hover:text-blue-800 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
            {mesesSeleccionados.map(mes => (
              <span key={mes} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                📆 {formatearMes(mes)}
                <button
                  onClick={() => eliminarMes(mes)}
                  className="text-green-600 hover:text-green-800 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
            {añosSeleccionados.map(año => (
              <span key={año} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                🗓️ {año}
                <button
                  onClick={() => eliminarAño(año)}
                  className="text-purple-600 hover:text-purple-800 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
            {categoriasSeleccionadas.map(categoria => (
              <span key={categoria} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                🏷️ {formatearCategoria(categoria)}
                <button
                  onClick={() => toggleCategoria(categoria)}
                  className="text-orange-600 hover:text-orange-800 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={ejecutarBusqueda}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
        >
          Buscar
        </button>
        <button
          onClick={limpiarTodo}
          className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
