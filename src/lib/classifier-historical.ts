// src/lib/classifier-historical.ts
// Variante del classifier para datos históricos con claves API exclusivas
import Groq from 'groq-sdk';
import { getDatabase, PatchEntry } from './database';
import fs from 'fs';
import path from 'path';

// Configuración de claves de Groq EXCLUSIVAS para datos históricos
const GROQ_API_KEYS_HISTORICAL = [
  process.env.GROQ_API_KEY_HISTORICAL_1,
  process.env.GROQ_API_KEY_HISTORICAL_2,
  process.env.GROQ_API_KEY_HISTORICAL_3,
  process.env.GROQ_API_KEY_HISTORICAL_4,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

// Función para obtener el cliente Groq con rotación de claves históricas
function getGroqClientHistorical(): Groq {
  const apiKey = GROQ_API_KEYS_HISTORICAL[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS_HISTORICAL.length;
  
  return new Groq({ apiKey });
}

// Configuración optimizada para llama-3.3-70b-versatile
const MODEL = 'llama-3.3-70b-versatile';
const CHUNK_SIZE = 3; // Reducido para evitar límites de tokens (12000 TPM)
const PAUSE_MS = 2000; // Aumentado para evitar rate limits
const MAX_CONTENT_LENGTH = 6000; // Reducido para evitar exceso de tokens

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función para estimar tokens (aproximación: 1 token ≈ 4 caracteres)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Función para validar que el prompt no exceda el límite de tokens
function validatePromptSize(prompt: string, maxTokens: number = 10000): boolean {
  const estimatedTokens = estimateTokens(prompt);
  if (estimatedTokens > maxTokens) {
    console.log(`⚠️  Prompt demasiado grande: ${estimatedTokens} tokens (límite: ${maxTokens})`);
    return false;
  }
  return true;
}

// Función para reintentar con diferentes claves en caso de rate limit
async function retryWithDifferentKeyHistorical<T>(
  operation: (client: Groq) => Promise<T>,
  maxRetries: number = GROQ_API_KEYS_HISTORICAL.length
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = getGroqClientHistorical();
      return await operation(client);
    } catch (error: any) {
      lastError = error;
      if (error.message?.match(/rate limit|429/gi)) {
        console.warn(`⚠️  Rate limit alcanzado con clave histórica ${currentKeyIndex}, rotando...`);
        await sleep(PAUSE_MS);
        continue;
      }
      throw error;
    }
  }
  
  throw lastError || new Error('Todas las claves históricas de Groq han fallado');
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

async function classifyItemsHistorical(data: PromptData[]): Promise<ClassificationResult[]> {
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

⚠️ CRÍTICO: Sé ESTRICTO pero EQUILIBRADO. El 80% de documentos del BOE son cambios administrativos menores, pero algunos sí tienen impacto sectorial o nacional.

CRITERIOS DE CLASIFICACIÓN:
- **BUFF**: Medidas que benefician, mejoran condiciones o amplían derechos (con relevancia nacional o sectorial significativa)
- **NERF**: Medidas que restringen, endurecen condiciones o reducen beneficios (con relevancia nacional o sectorial significativa)
- **ACTUALIZACIÓN**: Cambios técnicos, administrativos, nombramientos, convocatorias locales, correcciones, etc.

🔴 REGLA EQUILIBRADA: Si un documento tiene impacto sectorial significativo o afecta a grupos amplios, puede ser BUFF/NERF. Solo ACTUALIZACIÓN si es puramente administrativo.

ESCALA DE RELEVANCIA (1-100) - EQUILIBRADA:
- **95-100**: Reformas constitucionales, presupuestos generales del Estado, leyes orgánicas fundamentales
  Ejemplo: "Ley Orgánica de reforma del Código Penal" → 97
  ⚠️ ~1% de documentos deberían estar aquí

- **85-94**: Leyes nacionales importantes, reformas fiscales mayores, cambios en derechos fundamentales
  Ejemplo: "Real Decreto-ley de subida del salario mínimo interprofesional" → 88
  ⚠️ ~2% de documentos deberían estar aquí

- **70-84**: Cambios significativos en sectores importantes (sanidad, educación, empleo a nivel nacional)
  Ejemplo: "Real Decreto de nuevas prestaciones por desempleo" → 76
  ⚠️ ~5% de documentos deberían estar aquí

- **55-69**: Regulaciones sectoriales moderadas, afectan a sectores específicos pero amplios
  Ejemplo: "Orden de nuevas ayudas para autónomos" → 62
  ⚠️ ~10% de documentos deberían estar aquí

- **40-54**: Cambios administrativos con impacto limitado, regulaciones de nicho
  Ejemplo: "Resolución de bases reguladoras de subvenciones para cooperativas agrarias" → 48
  ⚠️ ~15% de documentos deberían estar aquí

- **25-39**: Convocatorias de empleo público, nombramientos importantes, correcciones menores
  Ejemplo: "Convocatoria de 50 plazas de funcionarios del Ministerio X" → 32
  ⚠️ ~15% de documentos pueden estar aquí

- **10-24**: Nombramientos individuales, correcciones de erratas, anuncios administrativos
  Ejemplo: "Nombramiento de Director General de la Agencia X" → 18
  ⚠️ ~20% de documentos pueden estar aquí

- **1-9**: Cambios puramente técnicos, correcciones tipográficas, anuncios sin impacto
  Ejemplo: "Corrección de errores en la Orden de 15 de marzo" → 5
  ⚠️ ~15% de documentos pueden estar aquí

EJEMPLOS CONCRETOS DE CLASIFICACIÓN EQUILIBRADA:

1. "Convocatoria de 200 plazas de Policía Nacional"
   → BUFF, relevancia: 35 (afecta a aspirantes y mejora seguridad)

2. "Modificación del convenio ICO para facilidades de financiación empresarial"
   → BUFF, relevancia: 52 (ayuda a empresas, sectorial importante)

3. "Admisión a trámite de recurso de inconstitucionalidad contra ley autonómica"
   → ACTUALIZACIÓN, relevancia: 18 (es un trámite procesal)

4. "Nombramiento de Secretario General Técnico del Ministerio de Cultura"
   → ACTUALIZACIÓN, relevancia: 12 (nombramiento individual)

5. "Real Decreto de aumento de pensiones mínimas en 50€/mes"
   → BUFF, relevancia: 75 (afecta a millones de pensionistas)

6. "Orden de exclusión de 3 deportistas de ayudas por dopaje"
   → NERF, relevancia: 8 (afecta solo a 3 personas específicas)

7. "Real Decreto de nuevas medidas de apoyo a la industria automotriz"
   → BUFF, relevancia: 58 (sectorial importante)

8. "Convocatoria de ayudas para jóvenes agricultores"
   → BUFF, relevancia: 42 (sectorial moderado)

DOCUMENTOS A ANALIZAR:
${batchPrompts}

INSTRUCCIONES EQUILIBRADAS:
1. Sé CONSERVADOR pero no extremo con las puntuaciones altas (70+)
2. El 80% de documentos deberían ser ACTUALIZACIÓN, 20% BUFF/NERF
3. Clasifica como BUFF/NERF si hay impacto sectorial significativo o nacional
4. USA VALORES ÚNICOS Y VARIADOS del 1-100: 23, 37, 41, 46, 52, 59, 64, 71, etc.
5. EVITA PUNTUACIONES REPETIDAS: Si ya usaste 45, usa 43, 47, 49, 51, etc.
6. Nombramientos individuales, correcciones menores → ACTUALIZACIÓN
7. Convocatorias sectoriales, ayudas específicas → BUFF/NERF según impacto
8. Si dudas entre buff/nerf y actualización → evalúa el impacto sectorial
9. DISTRIBUYE las puntuaciones: usa todo el rango 1-100 de forma equilibrada
10. IMPORTANTE: Si un documento tiene algún impacto sectorial o afecta a grupos específicos, clasifícalo como BUFF/NERF, no como ACTUALIZACIÓN

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
      console.log(`🤖 [HISTÓRICO] Clasificando lote ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(data.length/CHUNK_SIZE)} (${batch.length} items)...`);
      
      const result = await retryWithDifferentKeyHistorical(async (groq) => {
        const res = await groq.chat.completions.create({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 4000,
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
        console.warn(`⚠️  [HISTÓRICO] Algunos resultados del lote ${i}-${i+CHUNK_SIZE} no pasaron validación`);
      }

      all.push(...validResults);
      
      // Mostrar progreso
      validResults.forEach((r: ClassificationResult) => {
        const emoji = r.tipo === 'buff' ? '🔼' : r.tipo === 'nerf' ? '🔽' : '⚙️';
        console.log(`  ${emoji} [HISTÓRICO] ${r.tipo.toUpperCase()} (${r.relevance}/100): ${r.summary.substring(0, 80)}...`);
      });
      
    } catch (e: any) {
      console.error(`❌ [HISTÓRICO] Error en lote ${i}-${i+CHUNK_SIZE}:`, e.message);
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

// Función principal para clasificar y guardar en base de datos (versión histórica)
export async function classifyAndSaveToDatabaseHistorical(fecha: string): Promise<void> {
  console.log(`🚀 [HISTÓRICO] Iniciando clasificación automática para fecha: ${fecha}`);
  
  const db = getDatabase();
  
  // Verificar si ya existen datos para esta fecha
  if (db.hasDataForDate(fecha)) {
    console.log(`✅ [HISTÓRICO] Ya existen datos clasificados para ${fecha}, saltando...`);
    return;
  }

  const jsonDir = path.join(process.cwd(), 'data', 'json', fecha);
  if (!fs.existsSync(jsonDir)) {
    console.error(`❌ [HISTÓRICO] No existe directorio: ${jsonDir}`);
    return;
  }

  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error(`❌ [HISTÓRICO] No hay archivos JSON en: ${jsonDir}`);
    return;
  }

  console.log(`📊 [HISTÓRICO] Procesando ${files.length} documentos...`);

  // Leer todos los archivos JSON
  const promptData: PromptData[] = [];
  const originalData: { [key: string]: any } = {};

  for (const file of files) {
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
      console.error(`❌ [HISTÓRICO] Error procesando ${filePath}:`, e.message);
    }
  }

  if (promptData.length === 0) {
    console.error('❌ [HISTÓRICO] No se pudieron procesar archivos JSON');
    return;
  }

  // Clasificar con Groq (versión histórica)
  console.log('🤖 [HISTÓRICO] Iniciando clasificación con Groq...\n');
  const classifications = await classifyItemsHistorical(promptData);

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
    console.log(`💾 [HISTÓRICO] Guardando ${patchesToSave.length} patches relevantes en base de datos...`);
    db.insertPatches(patchesToSave);
    
    const stats = db.getStatsByDate(fecha);
    console.log(`✅ [HISTÓRICO] Guardado completado:`);
    console.log(`   🔼 BUFFS: ${stats.buffs}`);
    console.log(`   🔽 NERFS: ${stats.nerfs}`);
    console.log(`   📊 TOTAL: ${stats.total}`);
  } else {
    console.log(`ℹ️  [HISTÓRICO] No se encontraron BUFFS o NERFS relevantes para ${fecha}`);
  }

  console.log(`🎉 [HISTÓRICO] Clasificación automática completada para ${fecha}\n`);
}
