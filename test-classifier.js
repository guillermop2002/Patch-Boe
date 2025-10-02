// test-classifier.js
const { classifyAndSaveToDatabase } = require('./dist/classifier');

async function test() {
  try {
    console.log('🧪 Iniciando prueba de clasificación...');
    await classifyAndSaveToDatabase('20241001');
    console.log('✅ Prueba completada');
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

test();
