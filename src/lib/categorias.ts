// src/lib/categorias.ts
// Utilidades para manejar categorías del BOE con colores

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
  
  return (
    <span 
      className={`categoria-badge ${categoria.colorLight} ${categoria.colorText} ${categoria.colorBorder} ${className}`}
      style={{
        background: `linear-gradient(135deg, var(--${categoria.color.replace('bg-', '')}-100), var(--${categoria.color.replace('bg-', '')}-200))`,
        borderColor: `var(--${categoria.colorBorder.replace('border-', '')})`,
        color: `var(--${categoria.colorText.replace('text-', '')})`
      }}
    >
      {categoria.nombre}
    </span>
  );
}
