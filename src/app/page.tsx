'use client';

import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchPatches();
  }, []);

  const fetchPatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedType && { tipo: selectedType })
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
            🇪🇸 Patch Legislativo
          </h1>

          <p className="text-center text-gray-600 mb-8">
            Descubre los cambios normativos clasificados como patches de videojuego
          </p>

          {/* Formulario de búsqueda */}
          <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Buscar en títulos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los tipos</option>
                  <option value="buff">BUFF</option>
                  <option value="nerf">NERF</option>
                  <option value="actualización">ACTUALIZACIÓN</option>
                </select>
              </div>

              <div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5 resultados</option>
                  <option value={10}>10 resultados</option>
                  <option value={20}>20 resultados</option>
                  <option value={50}>50 resultados</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Buscar Patches
            </button>
          </form>

          {/* Resultados */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando patches...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron patches. Intenta con otros términos de búsqueda.
                </div>
              ) : (
                patches.map((patch) => (
                  <div key={patch.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {patch.titulo}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTipoColor(patch.tipo)}`}>
                          {patch.tipo.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {patch.relevancia}/100
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
