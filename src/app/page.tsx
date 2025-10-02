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



  return (
    <div>
      <Header />

      <main className="container">
        <h1 className="main-title">🇪🇸 Patch Legislativo</h1>
        <p className="main-subtitle">
          Descubre los cambios normativos del BOE como si fueran patches de videojuegos
        </p>

        {/* Buscador de Patches */}
        <div className="search-card">
          <h2 className="search-title">Buscador de Patches</h2>
          <p className="search-subtitle">Encuentra cambios normativos por fecha y tipo</p>

          <form onSubmit={handleSearch}>
            {/* Tipo y Resultados */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="form-select"
                >
                  <option value="">Ambos</option>
                  <option value="buff">BUFF</option>
                  <option value="nerf">NERF</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resultados</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="form-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>Todo</option>
                </select>
              </div>
            </div>

            {/* Fecha específica */}
            <div className="form-group">
              <label className="form-label">Fecha específica</label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  setSpecificDate(e.target.value);
                  if (e.target.value) addFilter('Fecha específica', e.target.value);
                }}
                className="form-input"
              />
            </div>

            {/* Mes completo */}
            <div className="form-group">
              <label className="form-label">Mes completo</label>
              <input
                type="month"
                value={monthYear}
                onChange={(e) => {
                  setMonthYear(e.target.value);
                  if (e.target.value) addFilter('Mes completo', e.target.value);
                }}
                className="form-input"
              />
            </div>

            {/* Año completo */}
            <div className="form-group">
              <label className="form-label">Año completo</label>
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
                className="form-input"
              />
            </div>
          </form>
        </div>

        {/* Filtros activos */}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            <div className="active-filters-header">
              <span className="active-filters-title">Filtros activos:</span>
              <button onClick={clearAllFilters} className="clear-all-btn">
                Limpiar
              </button>
            </div>
            <div className="filter-tags">
              {activeFilters.map((filter, index) => (
                <span key={index} className="filter-tag">
                  📅 {filter}
                  <button
                    onClick={() => removeFilter(filter)}
                    className="filter-tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="btn-group">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            onClick={clearAllFilters}
            className="btn btn-secondary"
          >
            Limpiar
          </button>
        </div>

        {/* Resultados */}
        <div className="results-card">
          <div className="results-header">
            <div className="results-title">
              <span>📊</span>
              Resultados de búsqueda ({patches.length})
            </div>
            <button
              onClick={() => window.location.reload()}
              className="back-to-today"
            >
              🔄 Volver a hoy
            </button>
          </div>

          <div className="results-content">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Cargando patches...</p>
              </div>
            ) : patches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p className="empty-title">No se encontraron resultados</p>
                <p className="empty-subtitle">Intenta con otros criterios de búsqueda</p>
              </div>
            ) : (
              <div className="patches-list">
                {patches.map((patch) => (
                  <div key={patch.id} className="patch-card">
                    <div className="patch-header">
                      <div className="patch-content">
                        <h3 className="patch-title">{patch.titulo}</h3>
                        <div className="patch-meta">
                          <span className="patch-date">📅 {formatDate(patch.fecha)}</span>
                          <a
                            href={`https://www.boe.es/diario_boe/txt.php?id=${patch.boe_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="patch-link"
                          >
                            📄 {patch.boe_id}
                          </a>
                        </div>
                      </div>
                      <div className="patch-badges">
                        <span className={`patch-badge patch-badge-${patch.tipo.toLowerCase()}`}>
                          {patch.tipo.toUpperCase()}
                        </span>
                        <span className="patch-relevance">
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
      </main>
    </div>
  );
}
