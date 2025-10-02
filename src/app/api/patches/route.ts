import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

interface Patch {
  id: string;
  fecha: string;
  titulo: string;
  tipo: string;
  relevancia: number;
  boe_id: string;
}

function getDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'db', 'patches.db');
  
  try {
    const db = new Database(dbPath);
    
    // Crear tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS patches (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL,
        relevancia INTEGER NOT NULL,
        boe_id TEXT NOT NULL,
        contenido TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    return db;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const tipo = searchParams.get('tipo') || '';
  const fecha = searchParams.get('fecha') || '';
  const mes = searchParams.get('mes') || '';
  const año = searchParams.get('año') || '';
  const limit = parseInt(searchParams.get('limit') || '10');

  const db = getDatabase();
  if (!db) {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }

  try {
    let query = `
      SELECT id, fecha, titulo, tipo, summary, relevance
      FROM patches
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (search) {
      query += ` AND titulo LIKE ?`;
      params.push(`%${search}%`);
    }

    if (tipo) {
      query += ` AND LOWER(tipo) = LOWER(?)`;
      params.push(tipo);
    }

    // Filtros de fecha
    if (fecha) {
      // Fecha específica (formato YYYY-MM-DD -> YYYYMMDD)
      const fechaFormateada = fecha.replace(/-/g, '');
      query += ` AND fecha = ?`;
      params.push(fechaFormateada);
    } else if (mes) {
      // Mes completo (formato YYYY-MM -> YYYYMM%)
      const mesFormateado = mes.replace(/-/g, '');
      query += ` AND fecha LIKE ?`;
      params.push(`${mesFormateado}%`);
    } else if (año) {
      // Año completo (formato YYYY -> YYYY%)
      query += ` AND fecha LIKE ?`;
      params.push(`${año}%`);
    }

    query += ` ORDER BY fecha DESC, relevancia DESC`;

    if (limit !== 100) { // 100 significa "Todo"
      query += ` LIMIT ?`;
      params.push(limit);
    }

    const stmt = db.prepare(query);
    const patches = stmt.all(...params) as Patch[];

    db.close();

    return NextResponse.json({
      patches,
      total: patches.length
    });

  } catch (error) {
    console.error('Database query error:', error);
    db.close();

    return NextResponse.json(
      { error: 'Database query failed' },
      { status: 500 }
    );
  }
}
