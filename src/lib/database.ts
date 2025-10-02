// src/lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface PatchEntry {
  id: string;
  fecha: string;
  titulo: string;
  tipo: 'buff' | 'nerf';
  summary: string;
  relevance: number;
  contenido: string;
  created_at: string;
}

class PatchDatabase {
  private db: Database.Database;

  constructor() {
    // Crear directorio de base de datos si no existe
    const dbDir = path.join(process.cwd(), 'data', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'patches.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    // Crear tabla si no existe
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patches (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('buff', 'nerf')),
        summary TEXT NOT NULL,
        relevance INTEGER NOT NULL CHECK (relevance >= 1 AND relevance <= 100),
        contenido TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(id, fecha)
      )
    `);

    // Crear índices para optimizar consultas
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_fecha ON patches(fecha);
      CREATE INDEX IF NOT EXISTS idx_tipo ON patches(tipo);
      CREATE INDEX IF NOT EXISTS idx_relevance ON patches(relevance);
      CREATE INDEX IF NOT EXISTS idx_fecha_tipo ON patches(fecha, tipo);
    `);
  }

  // Insertar un nuevo patch (solo BUFF o NERF)
  insertPatch(patch: Omit<PatchEntry, 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO patches 
      (id, fecha, titulo, tipo, summary, relevance, contenido, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      patch.id,
      patch.fecha,
      patch.titulo,
      patch.tipo,
      patch.summary,
      patch.relevance,
      patch.contenido,
      new Date().toISOString()
    );
  }

  // Insertar múltiples patches en una transacción
  insertPatches(patches: Omit<PatchEntry, 'created_at'>[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO patches 
      (id, fecha, titulo, tipo, summary, relevance, contenido, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((patches: Omit<PatchEntry, 'created_at'>[]) => {
      const now = new Date().toISOString();
      for (const patch of patches) {
        stmt.run(
          patch.id,
          patch.fecha,
          patch.titulo,
          patch.tipo,
          patch.summary,
          patch.relevance,
          patch.contenido,
          now
        );
      }
    });

    insertMany(patches);
  }

  // Obtener patches por fecha
  getPatchesByDate(fecha: string): PatchEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM patches 
      WHERE fecha = ? 
      ORDER BY relevance DESC, tipo ASC
    `);
    return stmt.all(fecha) as PatchEntry[];
  }

  // Obtener patches por fecha y tipo
  getPatchesByDateAndType(fecha: string, tipo: 'buff' | 'nerf'): PatchEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM patches 
      WHERE fecha = ? AND tipo = ? 
      ORDER BY relevance DESC
    `);
    return stmt.all(fecha, tipo) as PatchEntry[];
  }

  // Obtener estadísticas por fecha
  getStatsByDate(fecha: string): { buffs: number; nerfs: number; total: number } {
    const stmt = this.db.prepare(`
      SELECT 
        tipo,
        COUNT(*) as count
      FROM patches 
      WHERE fecha = ? 
      GROUP BY tipo
    `);
    
    const results = stmt.all(fecha) as { tipo: string; count: number }[];
    const stats = { buffs: 0, nerfs: 0, total: 0 };
    
    for (const result of results) {
      if (result.tipo === 'buff') stats.buffs = result.count;
      if (result.tipo === 'nerf') stats.nerfs = result.count;
      stats.total += result.count;
    }
    
    return stats;
  }

  // Verificar si ya existen datos para una fecha
  hasDataForDate(fecha: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM patches WHERE fecha = ?
    `);
    const result = stmt.get(fecha) as { count: number };
    return result.count > 0;
  }

  // Obtener fechas disponibles
  getAvailableDates(): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT fecha
      FROM patches
      ORDER BY fecha DESC
    `);
    return stmt.all().map((row: any) => row.fecha);
  }

  // Búsqueda avanzada con múltiples criterios
  buscarPatches(criterios: {
    fechasEspecificas?: string[]
    meses?: string[] // YYYYMM
    años?: string[] // YYYY
    tipoFiltro?: 'buff' | 'nerf' | 'ambos'
  }): PatchEntry[] {
    let whereConditions: string[] = [];
    let params: any[] = [];

    // Filtro por tipo
    if (criterios.tipoFiltro && criterios.tipoFiltro !== 'ambos') {
      whereConditions.push('tipo = ?');
      params.push(criterios.tipoFiltro);
    }

    // Construir condiciones de fecha
    let fechaConditions: string[] = [];

    // Fechas específicas
    if (criterios.fechasEspecificas && criterios.fechasEspecificas.length > 0) {
      const placeholders = criterios.fechasEspecificas.map(() => '?').join(',');
      fechaConditions.push(`fecha IN (${placeholders})`);
      params.push(...criterios.fechasEspecificas);
    }

    // Meses (YYYYMM)
    if (criterios.meses && criterios.meses.length > 0) {
      const mesConditions = criterios.meses.map(() => 'fecha LIKE ?').join(' OR ');
      fechaConditions.push(`(${mesConditions})`);
      params.push(...criterios.meses.map(mes => `${mes}%`));
    }

    // Años (YYYY)
    if (criterios.años && criterios.años.length > 0) {
      const añoConditions = criterios.años.map(() => 'fecha LIKE ?').join(' OR ');
      fechaConditions.push(`(${añoConditions})`);
      params.push(...criterios.años.map(año => `${año}%`));
    }

    // Combinar condiciones de fecha con OR
    if (fechaConditions.length > 0) {
      whereConditions.push(`(${fechaConditions.join(' OR ')})`);
    }

    // Construir query final
    let query = 'SELECT * FROM patches';
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    query += ' ORDER BY relevance DESC, fecha DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as PatchEntry[];
  }

  // Limpiar datos de una fecha específica
  clearDataForDate(fecha: string): void {
    const stmt = this.db.prepare(`DELETE FROM patches WHERE fecha = ?`);
    stmt.run(fecha);
  }

  // Cerrar conexión
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: PatchDatabase | null = null;

export function getDatabase(): PatchDatabase {
  if (!dbInstance) {
    dbInstance = new PatchDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
