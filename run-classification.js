// run-classification.js
// Script para ejecutar la clasificación con output completo

// Cargar variables de entorno desde .env.local
const fs = require('fs');
const path = require('path');

console.log('🔧 Cargando variables de entorno...');
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  console.log('✅ Variables de entorno cargadas');
} else {
  console.error('❌ No se encontró .env.local');
  process.exit(1);
}

// Verificar claves
const keys = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4
].filter(Boolean);

console.log(`📊 Claves de Groq encontradas: ${keys.length}`);

if (keys.length === 0) {
  console.error('❌ No se encontraron claves de Groq');
  process.exit(1);
}

// Importar y ejecutar clasificación
console.log('📦 Importando classifier...');
const { classifyAndSaveToDatabase } = require('./dist/classifier.js');

console.log('🚀 Iniciando clasificación para fecha 20250929...\n');

classifyAndSaveToDatabase('20250929')
  .then(() => {
    console.log('\n✅ Clasificación completada exitosamente');
    process.exit(0);
  })
  .catch(e => {
    console.error('\n❌ Error en clasificación:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  });

