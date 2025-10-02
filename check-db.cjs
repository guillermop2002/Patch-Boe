// check-db.cjs
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'db', 'patches.db');
const db = new Database(dbPath, { readonly: true });

// Obtener todas las fechas disponibles
const fechas = db.prepare('SELECT DISTINCT fecha FROM patches ORDER BY fecha DESC').all();
console.log('📅 Fechas disponibles en la base de datos:');
fechas.forEach(f => {
  const count = db.prepare('SELECT COUNT(*) as total FROM patches WHERE fecha = ?').get(f.fecha);
  console.log(`  - ${f.fecha}: ${count.total} patches`);
});

// Obtener algunos patches de ejemplo
console.log('\n📄 Ejemplos de patches:');
const patches = db.prepare('SELECT id, fecha, titulo, tipo, relevance FROM patches LIMIT 5').all();
patches.forEach(p => {
  console.log(`  ${p.tipo.toUpperCase()} (${p.relevance}/100) - ${p.titulo.substring(0, 80)}...`);
  console.log(`    ID: ${p.id} | Fecha: ${p.fecha}`);
});

db.close();
