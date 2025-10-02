#!/usr/bin/env node

// scripts/xml-to-json.cjs
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// Configuración del parser XML
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: true,
  trimValues: true
});

function extraerTextoLimpio(obj) {
  if (typeof obj === 'string') {
    return obj.trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(extraerTextoLimpio).join(' ').trim();
  }
  
  if (obj && typeof obj === 'object') {
    let texto = '';
    
    // Extraer texto directo
    if (obj['#text']) {
      texto += obj['#text'] + ' ';
    }
    
    // Extraer texto de propiedades anidadas
    for (const key in obj) {
      if (key !== '#text' && !key.startsWith('@_')) {
        texto += extraerTextoLimpio(obj[key]) + ' ';
      }
    }
    
    return texto.trim();
  }
  
  return '';
}

function procesarDocumentoXML(xmlContent, docId) {
  try {
    const jsonObj = parser.parse(xmlContent);
    
    // Navegar por la estructura del BOE
    const documento = jsonObj.documento || jsonObj;
    
    // Extraer metadatos
    const metadatos = documento.metadatos || {};
    const analisis = documento.analisis || {};
    const texto = documento.texto || {};
    
    // Extraer título
    let titulo = '';
    if (metadatos.titulo) {
      titulo = extraerTextoLimpio(metadatos.titulo);
    } else if (analisis.resumen) {
      titulo = extraerTextoLimpio(analisis.resumen);
    } else if (texto.titulo) {
      titulo = extraerTextoLimpio(texto.titulo);
    }
    
    // Extraer contenido principal
    let contenido = '';
    
    // Intentar extraer del texto principal
    if (texto.articulos) {
      contenido += extraerTextoLimpio(texto.articulos) + ' ';
    }
    if (texto.disposiciones) {
      contenido += extraerTextoLimpio(texto.disposiciones) + ' ';
    }
    if (texto.anexos) {
      contenido += extraerTextoLimpio(texto.anexos) + ' ';
    }
    
    // Si no hay contenido específico, extraer todo el texto
    if (!contenido.trim()) {
      contenido = extraerTextoLimpio(texto);
    }
    
    // Si aún no hay contenido, extraer de todo el documento
    if (!contenido.trim()) {
      contenido = extraerTextoLimpio(documento);
    }
    
    // Limpiar y formatear
    titulo = titulo.replace(/\s+/g, ' ').trim();
    contenido = contenido.replace(/\s+/g, ' ').trim();
    
    // Limitar contenido si es muy largo
    if (contenido.length > 10000) {
      contenido = contenido.substring(0, 10000) + '... [CONTENIDO TRUNCADO]';
    }
    
    return {
      ID: docId,
      TITULO: titulo || `Documento ${docId}`,
      CONTENIDO: contenido || 'Sin contenido disponible'
    };
    
  } catch (error) {
    console.warn(`⚠️ Error procesando XML ${docId}: ${error.message}`);
    return {
      ID: docId,
      TITULO: `Documento ${docId} (Error de procesamiento)`,
      CONTENIDO: 'Error al procesar el contenido XML'
    };
  }
}

async function convertirXMLsAJSON(fecha) {
  const xmlDir = path.join(process.cwd(), 'data', 'xml', fecha);
  const jsonDir = path.join(process.cwd(), 'data', 'json', fecha);
  
  if (!fs.existsSync(xmlDir)) {
    console.error(`❌ No existe directorio XML: ${xmlDir}`);
    return;
  }
  
  // Crear directorio JSON si no existe
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }
  
  const xmlFiles = fs.readdirSync(xmlDir).filter(f => f.endsWith('.xml'));
  
  if (xmlFiles.length === 0) {
    console.error(`❌ No hay archivos XML en: ${xmlDir}`);
    return;
  }
  
  console.log(`🔄 Convirtiendo ${xmlFiles.length} archivos XML a JSON...`);
  
  let procesados = 0;
  let errores = 0;
  
  for (const xmlFile of xmlFiles) {
    const xmlPath = path.join(xmlDir, xmlFile);
    const docId = path.basename(xmlFile, '.xml');
    const jsonPath = path.join(jsonDir, `${docId}.json`);
    
    try {
      const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
      const jsonData = procesarDocumentoXML(xmlContent, docId);
      
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      procesados++;
      
      if (procesados % 10 === 0) {
        console.log(`📄 Procesados ${procesados}/${xmlFiles.length} documentos...`);
      }
      
    } catch (error) {
      console.error(`❌ Error procesando ${xmlFile}: ${error.message}`);
      errores++;
    }
  }
  
  console.log(`✅ Conversión completada:`);
  console.log(`   📄 Procesados: ${procesados}`);
  console.log(`   ❌ Errores: ${errores}`);
  console.log(`   📁 JSON guardados en: ${jsonDir}`);
}

// Función principal
async function main() {
  const fecha = process.argv[2];
  
  if (!fecha) {
    console.error('❌ Uso: node xml-to-json.cjs <YYYYMMDD>');
    process.exit(1);
  }
  
  console.log(`🔄 Iniciando conversión XML a JSON para fecha: ${fecha}`);
  await convertirXMLsAJSON(fecha);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { convertirXMLsAJSON };
