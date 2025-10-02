'use client';

import { useState } from 'react';
import Header from '../components/Header';

interface Patch {
  id: string;
  fecha: string;
  titulo: string;
  tipo: string;
  relevancia: number;
  boe_id: string;
}

export default function Home() {
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [limit, setLimit] = useState(10);
  const [specificDate, setSpecificDate] = useState('');
  const [monthYear, setMonthYear] = useState('');
  const [year, setYear] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const fetchPatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedType && { tipo: selectedType }),
        ...(specificDate && { fecha: specificDate }),
        ...(monthYear && { mes: monthYear }),
        ...(year && { año: year })
      });

      const response = await fetch(`/api/patches?${params}`);
      const data = await response.json();
      setPatches(data.patches || []);
    } catch (error) {
      console.error('Error fetching patches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatches();
  };

  const addFilter = (type: string, value: string) => {
    const filterText = `${type}: ${value}`;
    if (!activeFilters.includes(filterText)) {
      setActiveFilters([...activeFilters, filterText]);
    }
  };

  const removeFilter = (filterToRemove: string) => {
    setActiveFilters(activeFilters.filter(filter => filter !== filterToRemove));
    // Reset corresponding state based on filter type
    if (filterToRemove.includes('Fecha específica')) {
      setSpecificDate('');
    } else if (filterToRemove.includes('Mes completo')) {
      setMonthYear('');
    } else if (filterToRemove.includes('Año completo')) {
      setYear('');
    }
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSpecificDate('');
    setMonthYear('');
    setYear('');
    setSearchTerm('');
    setSelectedType('');
  };

  const formatDate = (dateStr: string) => {
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'buff': return 'text-green-600 bg-green-100';
      case 'nerf': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            🇪🇸 Patch Legislativo
          </h1>

          <p className="text-gray-600 mb-6">
            Descubre los cambios normativos del BOE como si fueran patches de videojuegos
          </p>

          {/* Buscador de Patches */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Buscador de Patches</h2>
            <p className="text-sm text-gray-600 mb-4">Encuentra cambios normativos por fecha y tipo</p>

            <form onSubmit={handleSearch} className="space-y-4">
              {/* Tipo y Resultados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Ambos</option>
                    <option value="buff">BUFF</option>
                    <option value="nerf">NERF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resultados</label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>Todo</option>
                  </select>
                </div>
              </div>

              {/* Fecha específica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha específica</label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    if (e.target.value) addFilter('Fecha específica', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Mes completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes completo</label>
                <input
                  type="month"
                  value={monthYear}
                  onChange={(e) => {
                    setMonthYear(e.target.value);
                    if (e.target.value) addFilter('Mes completo', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Año completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año completo</label>
                <input
                  type="number"
                  min="2020"
                  max="2030"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    if (e.target.value) addFilter('Año completo', e.target.value);
                  }}
                  placeholder="YYYY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>
          </div>

          {/* Filtros activos */}
          {activeFilters.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Filtros activos:</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Limpiar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    📅 {filter}
                    <button
                      onClick={() => removeFilter(filter)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Limpiar
            </button>
          </div>

          {/* Resultados */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h2 className="text-lg font-semibold text-gray-800">
                  Resultados de búsqueda ({patches.length})
                </h2>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                🔄 Volver a hoy
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Cargando patches...</p>
                </div>
              ) : patches.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🔍</span>
                  <p className="text-gray-500 mb-2">No se encontraron resultados</p>
                  <p className="text-sm text-gray-400">Intenta con otros criterios de búsqueda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {patches.map((patch) => (
                    <div key={patch.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-2">
                            {patch.titulo}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>📅 {formatDate(patch.fecha)}</span>
                            <a
                              href={`https://www.boe.es/diario_boe/txt.php?id=${patch.boe_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              📄 {patch.boe_id}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(patch.tipo)}`}>
                            {patch.tipo.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {patch.relevancia}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
