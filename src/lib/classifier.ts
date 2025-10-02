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
Eres un experto analista legislativo que clasifica cambios normativos españoles como si fueran parches de videojuego.

CRITERIOS DE CLASIFICACIÓN:
- **BUFF**: Medidas que benefician, mejoran condiciones o amplían derechos de ciudadanos/empresas
- **NERF**: Medidas que restringen, endurecen condiciones o reducen beneficios
- **ACTUALIZACIÓN**: Cambios técnicos, procedimentales o administrativos sin impacto significativo

CRITERIOS DE RELEVANCIA (1-100):
- 90-100: Impacto nacional masivo (millones de personas)
- 70-89: Impacto sectorial importante (cientos de miles)
- 50-69: Impacto moderado (decenas de miles)
- 30-49: Impacto específico (miles de personas)
- 10-29: Impacto técnico o muy específico
- 1-9: Cambios menores o administrativos

EJEMPLOS DE REFERENCIA:
1. "Ley de aumento del salario mínimo interprofesional" → BUFF, 92 (afecta a millones)
2. "Real Decreto de nuevo impuesto sobre bebidas azucaradas" → NERF, 67 (afecta a consumidores)
3. "Orden ministerial de actualización de formularios administrativos" → ACTUALIZACIÓN, 15 (cambio técnico)

DOCUMENTOS A ANALIZAR:
${batchPrompts}

INSTRUCCIONES:
1. Analiza cada documento considerando su impacto real en la sociedad española
2. Clasifica según los criterios establecidos
3. Asigna relevancia basada en el número estimado de personas afectadas
4. Crea un resumen conciso del impacto principal

Responde ÚNICAMENTE con JSON válido:
{
  "results": [
    {
      "id": "ID_del_documento",
      "tipo": "buff|nerf|actualización",
      "summary": "Resumen del impacto en 1-2 líneas",
      "relevance": número_entero_1_a_100
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

  console.log(`📊 Procesando ${files.length} documentos...`);

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
