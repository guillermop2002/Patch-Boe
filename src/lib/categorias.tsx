// src/lib/categorias.ts
// Utilidades para manejar categorías del BOE con colores
import React from 'react';

export interface CategoriaInfo {
  id: string;
  nombre: string;
  color: string;
  colorLight: string;
  colorText: string;
  colorBorder: string;
}

export const categoriasDisponibles: CategoriaInfo[] = [
  { id: 'NormasYDisposiciones', nombre: 'Normas Y Disposiciones', color: 'bg-blue-500', colorLight: 'bg-blue-100', colorText: 'text-blue-800', colorBorder: 'border-blue-300' },
  { id: 'DisposicionesAdministrativas', nombre: 'Disposiciones Administrativas', color: 'bg-indigo-500', colorLight: 'bg-indigo-100', colorText: 'text-indigo-800', colorBorder: 'border-indigo-300' },
  { id: 'ActosIndividuales', nombre: 'Actos Individuales', color: 'bg-purple-500', colorLight: 'bg-purple-100', colorText: 'text-purple-800', colorBorder: 'border-purple-300' },
  { id: 'AnunciosEdictosNotificaciones', nombre: 'Anuncios Edictos Notificaciones', color: 'bg-pink-500', colorLight: 'bg-pink-100', colorText: 'text-pink-800', colorBorder: 'border-pink-300' },
  { id: 'ContratacionPublica', nombre: 'Contratacion Publica', color: 'bg-red-500', colorLight: 'bg-red-100', colorText: 'text-red-800', colorBorder: 'border-red-300' },
  { id: 'ConvocatoriasEmpleoPublico', nombre: 'Convocatorias Empleo Publico', color: 'bg-orange-500', colorLight: 'bg-orange-100', colorText: 'text-orange-800', colorBorder: 'border-orange-300' },
  { id: 'SubvencionesAyudas', nombre: 'Subvenciones Ayudas', color: 'bg-yellow-500', colorLight: 'bg-yellow-100', colorText: 'text-yellow-800', colorBorder: 'border-yellow-300' },
  { id: 'FiscalidadPresupuestos', nombre: 'Fiscalidad Presupuestos', color: 'bg-green-500', colorLight: 'bg-green-100', colorText: 'text-green-800', colorBorder: 'border-green-300' },
  { id: 'RegistrosPropiedadMercantil', nombre: 'Registros Propiedad Mercantil', color: 'bg-teal-500', colorLight: 'bg-teal-100', colorText: 'text-teal-800', colorBorder: 'border-teal-300' },
  { id: 'Jurisprudencia', nombre: 'Jurisprudencia', color: 'bg-cyan-500', colorLight: 'bg-cyan-100', colorText: 'text-cyan-800', colorBorder: 'border-cyan-300' },
  { id: 'NormativaInternacionalUE', nombre: 'Normativa Internacional UE', color: 'bg-sky-500', colorLight: 'bg-sky-100', colorText: 'text-sky-800', colorBorder: 'border-sky-300' },
  { id: 'CorreccionesRectificaciones', nombre: 'Correcciones Rectificaciones', color: 'bg-rose-500', colorLight: 'bg-rose-100', colorText: 'text-rose-800', colorBorder: 'border-rose-300' },
  { id: 'InformesEstadisticas', nombre: 'Informes Estadisticas', color: 'bg-violet-500', colorLight: 'bg-violet-100', colorText: 'text-violet-800', colorBorder: 'border-violet-300' },
  { id: 'TransparenciaFiscalizacion', nombre: 'Transparencia Fiscalizacion', color: 'bg-emerald-500', colorLight: 'bg-emerald-100', colorText: 'text-emerald-800', colorBorder: 'border-emerald-300' },
  { id: 'ConcursosYProcedimientos', nombre: 'Concursos Y Procedimientos', color: 'bg-amber-500', colorLight: 'bg-amber-100', colorText: 'text-amber-800', colorBorder: 'border-amber-300' },
  { id: 'SectorialesTecnicos', nombre: 'Sectoriales Tecnicos', color: 'bg-lime-500', colorLight: 'bg-lime-100', colorText: 'text-lime-800', colorBorder: 'border-lime-300' },
  { id: 'ComunicadosInstitucionales', nombre: 'Comunicados Institucionales', color: 'bg-slate-500', colorLight: 'bg-slate-100', colorText: 'text-slate-800', colorBorder: 'border-slate-300' },
  { id: 'PublicidadLegal', nombre: 'Publicidad Legal', color: 'bg-gray-500', colorLight: 'bg-gray-100', colorText: 'text-gray-800', colorBorder: 'border-gray-300' },
  { id: 'MedidasEmergencia', nombre: 'Medidas Emergencia', color: 'bg-red-600', colorLight: 'bg-red-200', colorText: 'text-red-900', colorBorder: 'border-red-400' },
  { id: 'Otros', nombre: 'Otros', color: 'bg-neutral-500', colorLight: 'bg-neutral-100', colorText: 'text-neutral-800', colorBorder: 'border-neutral-300' }
];

// Función para obtener los colores de una categoría
export function getCategoriaColors(categoriaId: string): CategoriaInfo {
  const categoria = categoriasDisponibles.find(c => c.id === categoriaId);
  return categoria || categoriasDisponibles.find(c => c.id === 'Otros')!;
}

// Componente para mostrar una categoría con su color
export function CategoriaBadge({ categoriaId, className = '' }: { categoriaId: string; className?: string }) {
  const categoria = getCategoriaColors(categoriaId);
  
  // Mapeo de colores a valores CSS
  const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
    'blue': { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', text: '#1e40af', border: '#93c5fd' },
    'indigo': { bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', text: '#3730a3', border: '#a5b4fc' },
    'purple': { bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', text: '#7c3aed', border: '#c4b5fd' },
    'pink': { bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', text: '#be185d', border: '#f9a8d4' },
    'red': { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', text: '#991b1b', border: '#fca5a5' },
    'orange': { bg: 'linear-gradient(135deg, #fed7aa, #fdba74)', text: '#9a3412', border: '#fb923c' },
    'yellow': { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', text: '#92400e', border: '#fbbf24' },
    'green': { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', text: '#166534', border: '#86efac' },
    'teal': { bg: 'linear-gradient(135deg, #ccfbf1, #99f6e4)', text: '#115e59', border: '#5eead4' },
    'cyan': { bg: 'linear-gradient(135deg, #cffafe, #a5f3fc)', text: '#155e75', border: '#67e8f9' },
    'sky': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', text: '#0c4a6e', border: '#7dd3fc' },
    'rose': { bg: 'linear-gradient(135deg, #ffe4e6, #fecdd3)', text: '#881337', border: '#fda4af' },
    'violet': { bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', text: '#5b21b6', border: '#a78bfa' },
    'emerald': { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', text: '#065f46', border: '#6ee7b7' },
    'amber': { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', text: '#92400e', border: '#fbbf24' },
    'lime': { bg: 'linear-gradient(135deg, #ecfccb, #d9f99d)', text: '#365314', border: '#bef264' },
    'slate': { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', text: '#334155', border: '#94a3b8' },
    'gray': { bg: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', text: '#374151', border: '#d1d5db' },
    'neutral': { bg: 'linear-gradient(135deg, #fafafa, #f5f5f5)', text: '#404040', border: '#d4d4d4' }
  };
  
  const colorKey = categoria.color.replace('bg-', '').replace('-500', '').replace('-600', '');
  const colors = colorMap[colorKey] || colorMap['gray'];
  
  return (
    <span 
      className={`categoria-badge ${className}`}
      style={{
        background: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        border: '1px solid',
        borderRadius: '12px',
        padding: '0.25rem 0.5rem',
        fontSize: '0.7rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'all 0.2s ease'
      }}
    >
      {categoria.nombre}
    </span>
  );
}
