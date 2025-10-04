// test-groq-simple.js
// Script simple para probar la conexión con Groq API

// Cargar variables de entorno desde .env.local
const fs = require('fs');
const path = require('path');

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

// Verificar que las claves existen
const keys = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4
].filter(Boolean);

console.log(`📊 Claves encontradas: ${keys.length}`);

if (keys.length === 0) {
  console.error('❌ No se encontraron claves de Groq');
  process.exit(1);
}

// Intentar importar groq-sdk
let Groq;
try {
  Groq = require('groq-sdk');
  console.log('✅ groq-sdk importado correctamente');
  console.log('   Tipo:', typeof Groq);
  console.log('   Tiene default?:', Groq.default ? 'Sí' : 'No');
} catch (e) {
  console.error('❌ Error importando groq-sdk:', e.message);
  process.exit(1);
}

// Usar el export correcto
const GroqClass = Groq.default || Groq;

// Probar con la primera clave
async function testGroq() {
  console.log('\n🧪 Probando conexión con Groq API...');
  
  try {
    const groq = new GroqClass({ apiKey: keys[0] });
    console.log('✅ Cliente Groq creado');
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Di solo "hola"' }],
      max_tokens: 10,
      temperature: 0.1
    });
    
    console.log('✅ Respuesta recibida:', response.choices[0].message.content);
    console.log('🎉 Conexión exitosa con Groq API');
    
  } catch (e) {
    console.error('❌ Error en la llamada a Groq:');
    console.error('   Mensaje:', e.message);
    console.error('   Tipo:', e.constructor.name);
    if (e.status) console.error('   Status:', e.status);
    if (e.code) console.error('   Code:', e.code);
    if (e.stack) console.error('   Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
  }
}

testGroq().then(() => {
  console.log('\n✅ Prueba completada');
}).catch(e => {
  console.error('\n❌ Error fatal:', e.message);
  process.exit(1);
});

