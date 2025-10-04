// src/lib/classifier.ts
import Groq from 'groq-sdk';
import { getDatabase, PatchEntry } from './database';
import fs from 'fs';
import path from 'path';

// Configuración de claves de Groq en rotación
const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

// Función para obtener el cliente Groq con rotación de claves
function getGroqClient(): Groq {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('No se encontraron claves de Groq configuradas');
  }
  
  const apiKey = GROQ_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
  
  return new Groq({ apiKey });
}

// Configuración optimizada para llama-3.3-70b-versatile
const MODEL = 'llama-3.3-70b-versatile';
const CHUNK_SIZE = 5; // Aumentado para aprovechar mejor el modelo más potente
const PAUSE_MS = 1500; // Reducido ya que el modelo es más estable
const MAX_CONTENT_LENGTH = 8000; // Aumentado para aprovechar la capacidad del modelo

// MODO DE PRUEBA: Limitar a 20 documentos para evitar rate limit durante pruebas
// IMPORTANTE: Cambiar a 0 para procesar TODOS los documentos en producción
const TEST_MODE_LIMIT = 0; // 0 = sin límite, >0 = limitar a N documentos

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función para reintentar con diferentes claves en caso de rate limit
async function retryWithDifferentKey<T>(
  operation: (client: Groq) => Promise<T>,
  maxRetries: number = GROQ_API_KEYS.length
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = getGroqClient();
      return await operation(client);
    } catch (error: any) {
      lastError = error;
      if (error.message?.match(/rate limit|429/gi)) {
        console.warn(`⚠️  Rate limit alcanzado con clave ${currentKeyIndex}, rotando...`);
        await sleep(PAUSE_MS);
        continue;
      }
      throw error;
    }
  }
  
  throw lastError || new Error('Todas las claves de Groq han fallado');
}

interface ClassificationResult {
  id: string;
  tipo: 'buff' | 'nerf' | 'actualización';
  summary: string;
  relevance: number;
}

function validateClassification(result: any): result is ClassificationResult {
  const validTypes = ['buff','nerf','actualización'];
  
  // Normalizar tipo a minúsculas
  if (result.tipo) {
    result.tipo = result.tipo.toLowerCase();
  }
  
  return (
    validTypes.includes(result.tipo) &&
    typeof result.summary === 'string' &&
    result.summary.length > 0 &&
    Number.isInteger(result.relevance) &&
    result.relevance >= 1 && 
    result.relevance <= 100
  );
}

interface PromptData {
  id: string;
  titulo: string;
  intro: string;
}

async function classifyItems(data: PromptData[]): Promise<ClassificationResult[]> {
  const all: ClassificationResult[] = [];

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const batch = data.slice(i, i + CHUNK_SIZE);

    const batchPrompts = batch.map(d => {
      const content = d.intro.length > MAX_CONTENT_LENGTH 
        ? d.intro.substring(0, MAX_CONTENT_LENGTH) + '... [CONTENIDO RECORTADO]' 
        : d.intro;
      return `ID: ${d.id}\nTÍTULO: ${d.titulo}\nCONTENIDO:\n${content}`;
    }).join('\n\n---\n\n');

    const prompt = `
Eres un analista legislativo ULTRA-CRÍTICO que clasifica cambios normativos españoles según su RELEVANCIA NACIONAL REAL.

⚠️ IMPORTANTE: Sé EXTREMADAMENTE ESTRICTO. El 95% de documentos del BOE son cambios administrativos menores que NO merecen puntuaciones altas.

CRITERIOS DE CLASIFICACIÓN:
- **BUFF**: Medidas que benefician, mejoran condiciones o amplían derechos (SOLO si tienen relevancia nacional)
- **NERF**: Medidas que restringen, endurecen condiciones o reducen beneficios (SOLO si tienen relevancia nacional)
- **ACTUALIZACIÓN**: Cambios técnicos, administrativos, nombramientos, convocatorias locales, correcciones, etc. (LA MAYORÍA DE DOCUMENTOS)

🔴 REGLA CRÍTICA: Si un documento NO tiene impacto nacional significativo, clasifícalo como ACTUALIZACIÓN, NO como buff/nerf.

ESCALA DE RELEVANCIA (1-100) - SÉ ULTRA-CONSERVADOR:
- **90-100**: SOLO reformas constitucionales, presupuestos generales del Estado (casi nunca)
  Ejemplo: "Ley de Presupuestos Generales del Estado 2025" → 94

- **75-89**: Leyes nacionales muy importantes, reformas fiscales mayores que afectan a millones
  Ejemplo: "Real Decreto-ley de subida del salario mínimo interprofesional" → 82

- **60-74**: Cambios significativos en sectores importantes a nivel nacional (sanidad, educación, empleo)
  Ejemplo: "Real Decreto de nuevas prestaciones por desempleo" → 68

- **45-59**: Regulaciones sectoriales moderadas, convenios importantes con impacto amplio
  Ejemplo: "Convenio ICO para facilidades de financiación empresarial" → 51

- **30-44**: Convocatorias de empleo público amplias, cambios administrativos con impacto limitado
  Ejemplo: "Convocatoria de 200 plazas de Policía Nacional" → 37

- **15-29**: Convocatorias pequeñas, nombramientos importantes, convenios específicos
  Ejemplo: "Convocatoria de 20 plazas de funcionarios del Ministerio X" → 23

- **5-14**: Nombramientos individuales, correcciones de erratas, anuncios administrativos
  Ejemplo: "Nombramiento de Director General de la Agencia X" → 11

- **1-4**: Cambios puramente técnicos, correcciones tipográficas, anuncios sin impacto
  Ejemplo: "Corrección de errores en la Orden de 15 de marzo" → 3

EJEMPLOS CONCRETOS CON PUNTUACIONES REDUCIDAS:

1. "Convocatoria de 200 plazas de Policía Nacional"
   → BUFF, relevancia: 37 (solo afecta a aspirantes, no a toda la población)

2. "Modificación del convenio ICO para facilidades de financiación empresarial"
   → BUFF, relevancia: 51 (ayuda a empresas pero es un convenio específico)

3. "Reglamentación de formación especializada en materias de familia e infancia"
   → BUFF, relevancia: 68 (afecta a profesionales del sector judicial/social)

4. "Convocatoria de proceso selectivo para personal laboral fijo (50 plazas)"
   → BUFF, relevancia: 43 (oportunidades de empleo público limitadas)

5. "Convenio para innovación tecnológica en aulas (Ceuta y Melilla)"
   → BUFF, relevancia: 49 (mejora educativa pero solo 2 ciudades)

6. "Convenio para establecimiento de Puntos de Atención al Emprendedor"
   → BUFF, relevancia: 46 (ayuda a emprendedores pero impacto limitado)

7. "Exclusión de deportista de alto nivel por dopaje"
   → NERF, relevancia: 6 (afecta solo a 1 persona)

8. "Nombramiento de Secretario General Técnico del Ministerio"
   → ACTUALIZACIÓN, relevancia: 11 (nombramiento individual)

DOCUMENTOS A ANALIZAR:
${batchPrompts}

INSTRUCCIONES ULTRA-CRÍTICAS:
1. REDUCE TODAS LAS PUNTUACIONES: Lo que antes era 58 → ahora 45-48, lo que era 63 → ahora 50-53, lo que era 81 → ahora 65-70
2. USA VALORES MUY VARIADOS: Evita repetir puntuaciones. Si tienes varios patches similares, usa: 43, 46, 49, 52, 55 (NO uses 58, 58, 58, 58)
3. SÉ EXTREMADAMENTE CONSERVADOR con puntuaciones >70 (solo <2% de patches deberían tenerlas)
4. La MAYORÍA de documentos deberían ser ACTUALIZACIÓN (no buff/nerf)
5. Solo clasifica como BUFF/NERF si hay impacto nacional real y medible
6. Nombramientos, convocatorias locales, correcciones → ACTUALIZACIÓN
7. Recursos, admisiones a trámite, anuncios → ACTUALIZACIÓN
8. Si dudas entre buff/nerf y actualización → elige ACTUALIZACIÓN
9. DISTRIBUYE las puntuaciones: No uses el mismo valor para múltiples patches en el mismo lote

Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicaciones):
{
  "results": [
    {
      "id": "ID_del_documento",
      "tipo": "buff|nerf|actualización",
      "summary": "Resumen conciso del impacto real",
      "relevance": número_entero_específico_1_a_100
    }
  ]
}`;

    try {
      console.log(`🤖 Clasificando lote ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(data.length/CHUNK_SIZE)} (${batch.length} items)...`);
      
      const result = await retryWithDifferentKey(async (groq) => {
        const res = await groq.chat.completions.create({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // Más determinístico para clasificación
          max_tokens: 4000, // Aumentado para aprovechar el modelo más potente
        });

        const content = res.choices[0]?.message?.content;
        if (!content) throw new Error('La IA no retornó contenido');

        // Extraer JSON del contenido
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No se encontró JSON válido en la respuesta');

        const payload = JSON.parse(jsonMatch[0]);
        if (!payload.results || !Array.isArray(payload.results)) {
          throw new Error('Formato de respuesta inválido');
        }

        return payload.results;
      });

      const validResults = result.filter(validateClassification);

      if (validResults.length !== result.length) {
        console.warn(`⚠️  Algunos resultados del lote ${i}-${i+CHUNK_SIZE} no pasaron validación`);
      }

      all.push(...validResults);
      
      // Mostrar progreso
      validResults.forEach((r: ClassificationResult) => {
        const emoji = r.tipo === 'buff' ? '🔼' : r.tipo === 'nerf' ? '🔽' : '⚙️';
        console.log(`  ${emoji} ${r.tipo.toUpperCase()} (${r.relevance}/100): ${r.summary.substring(0, 80)}...`);
      });
      
    } catch (e: any) {
      console.error(`❌ Error en lote ${i}-${i+CHUNK_SIZE}:`, e.message);
      if (e.message.match(/rate limit|429/gi)) {
        await sleep(PAUSE_MS * 2);
        i -= CHUNK_SIZE;
        continue;
      }
    }

    if (i + CHUNK_SIZE < data.length) {
      await sleep(PAUSE_MS);
    }
  }

  return all;
}

// Función principal para clasificar y guardar en base de datos
export async function classifyAndSaveToDatabase(fecha: string): Promise<void> {
  console.log(`🚀 Iniciando clasificación automática para fecha: ${fecha}`);
  
  const db = getDatabase();
  
  // Verificar si ya existen datos para esta fecha
  if (db.hasDataForDate(fecha)) {
    console.log(`✅ Ya existen datos clasificados para ${fecha}, saltando...`);
    return;
  }

  const jsonDir = path.join(process.cwd(), 'data', 'json', fecha);
  if (!fs.existsSync(jsonDir)) {
    console.error(`❌ No existe directorio: ${jsonDir}`);
    return;
  }

  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error(`❌ No hay archivos JSON en: ${jsonDir}`);
    return;
  }

  // Aplicar límite de prueba si está configurado
  const filesToProcess = TEST_MODE_LIMIT > 0 ? files.slice(0, TEST_MODE_LIMIT) : files;

  if (TEST_MODE_LIMIT > 0) {
    console.log(`⚠️  MODO DE PRUEBA: Limitando a ${TEST_MODE_LIMIT} documentos de ${files.length} totales`);
  }

  console.log(`📊 Procesando ${filesToProcess.length} documentos...`);

  // Leer todos los archivos JSON
  const promptData: PromptData[] = [];
  const originalData: { [key: string]: any } = {};

  for (const file of filesToProcess) {
    const filePath = path.join(jsonDir, file);
    try {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      promptData.push({
        id: jsonData.ID,
        titulo: jsonData.TITULO,
        intro: jsonData.CONTENIDO
      });
      originalData[jsonData.ID] = jsonData;
    } catch (e: any) {
      console.error(`❌ Error procesando ${filePath}:`, e.message);
    }
  }

  if (promptData.length === 0) {
    console.error('❌ No se pudieron procesar archivos JSON');
    return;
  }

  // Clasificar con Groq
  console.log('🤖 Iniciando clasificación con Groq...\n');
  const classifications = await classifyItems(promptData);

  // Filtrar solo BUFF y NERF, preparar para base de datos
  const patchesToSave: Omit<PatchEntry, 'created_at'>[] = [];
  
  for (const classification of classifications) {
    if (classification.tipo === 'buff' || classification.tipo === 'nerf') {
      const originalDoc = originalData[classification.id];
      if (originalDoc) {
        patchesToSave.push({
          id: classification.id,
          fecha: fecha,
          titulo: originalDoc.TITULO,
          tipo: classification.tipo,
          summary: classification.summary,
          relevance: classification.relevance,
          contenido: originalDoc.CONTENIDO
        });
      }
    }
  }

  // Guardar en base de datos
  if (patchesToSave.length > 0) {
    console.log(`💾 Guardando ${patchesToSave.length} patches relevantes en base de datos...`);
    db.insertPatches(patchesToSave);
    
    const stats = db.getStatsByDate(fecha);
    console.log(`✅ Guardado completado:`);
    console.log(`   🔼 BUFFS: ${stats.buffs}`);
    console.log(`   🔽 NERFS: ${stats.nerfs}`);
    console.log(`   📊 TOTAL: ${stats.total}`);
  } else {
    console.log(`ℹ️  No se encontraron BUFFS o NERFS relevantes para ${fecha}`);
  }

  console.log(`🎉 Clasificación automática completada para ${fecha}\n`);
}
