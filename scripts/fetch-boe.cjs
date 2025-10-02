#!/usr/bin/env node

// scripts/fetch-boe.cjs
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Función para obtener la fecha de hoy en formato YYYYMMDD
function getFechaHoy() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${año}${mes}${dia}`;
}

// Función para descargar archivo
function descargarArchivo(url, rutaDestino) {
  return new Promise((resolve, reject) => {
    const archivo = fs.createWriteStream(rutaDestino);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Error HTTP: ${response.statusCode}`));
        return;
      }
      
      response.pipe(archivo);
      
      archivo.on('finish', () => {
        archivo.close();
        resolve();
      });
      
      archivo.on('error', (err) => {
        fs.unlink(rutaDestino, () => {}); // Eliminar archivo parcial
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    // Obtener fecha del argumento o usar hoy
    let fecha;
    if (process.argv[2] === 'today') {
      fecha = getFechaHoy();
    } else if (process.argv[2]) {
      fecha = process.argv[2];
    } else {
      console.error('❌ Uso: node fetch-boe.cjs <YYYYMMDD> | today');
      process.exit(1);
    }

    console.log(`📅 Procesando BOE del ${fecha}...`);

    // Crear directorios necesarios
    const directorios = [
      'data',
      'data/xml',
      'data/json',
      'data/db',
      `data/xml/${fecha}`,
      `data/json/${fecha}`
    ];

    directorios.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // URL del sumario del BOE
    const urlSumario = `https://www.boe.es/diario_boe/xml.php?id=BOE-S-${fecha}`;
    const archivoSumario = `data/xml/sumario-${fecha}.xml`;

    console.log('📥 Descargando sumario...');
    await descargarArchivo(urlSumario, archivoSumario);

    // Leer y procesar el sumario
    const contenidoSumario = fs.readFileSync(archivoSumario, 'utf-8');
    
    // Extraer IDs de documentos usando regex simple
    const regex = /id="(BOE-[A-Z]-\d{4}-\d+)"/g;
    const documentos = [];
    let match;
    
    while ((match = regex.exec(contenidoSumario)) !== null) {
      documentos.push(match[1]);
    }

    console.log(`📄 Encontrados ${documentos.length} documentos`);

    // Descargar cada documento
    for (let i = 0; i < documentos.length; i++) {
      const docId = documentos[i];
      const urlDoc = `https://www.boe.es/diario_boe/xml.php?id=${docId}`;
      const archivoDoc = `data/xml/${fecha}/${docId}.xml`;
      
      console.log(`📥 Descargando ${i + 1}/${documentos.length}: ${docId}`);
      
      try {
        await descargarArchivo(urlDoc, archivoDoc);
        
        // Pequeña pausa para no sobrecargar el servidor
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`⚠️ Error descargando ${docId}: ${error.message}`);
      }
    }

    console.log('✅ Descarga completada');

    // Convertir XML a JSON
    console.log('🔄 Convirtiendo XML a JSON...');
    try {
      execSync(`node scripts/xml-to-json.cjs ${fecha}`, { stdio: 'inherit' });
      console.log('✅ Conversión XML a JSON completada');
    } catch (error) {
      console.error('❌ Error en la conversión XML a JSON:', error.message);
      process.exit(1);
    }

    // Compilar TypeScript si es necesario
    console.log('🔧 Compilando TypeScript...');
    try {
      execSync('npx tsc --outDir dist src/lib/database.ts src/lib/classifier.ts src/lib/openai.ts src/lib/fechas.ts --target es2017 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Error compilando TypeScript, continuando...');
    }

    // Ejecutar procesamiento y clasificación
    console.log('🤖 Iniciando procesamiento y clasificación...');
    try {
      execSync(`node dist/classifier.js ${fecha}`, { stdio: 'inherit' });
      console.log('✅ Procesamiento completado');
    } catch (error) {
      console.error('❌ Error en el procesamiento:', error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
