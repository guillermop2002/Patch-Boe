// src/lib/openai.ts
import Groq from 'groq-sdk';
import type { PromptData } from './boe';
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

export interface Classification {
  id: string;
  tipo: 'buff' | 'nerf' | 'actualización';
  summary: string;       // resumen breve de porqué
  relevance: number;     // 1..100
}

// Configuración para Groq
const CHUNK_SIZE = 5;
const MODEL = 'llama-3.1-8b-instant'; // Modelo de Groq
const PAUSE_MS = 1500;
const MAX_CONTENT_LENGTH = 6000;

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
        console.warn(`Rate limit alcanzado con clave ${currentKeyIndex}, rotando...`);
        await sleep(PAUSE_MS);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Todas las claves de Groq han fallado');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateClassification(result: any): result is Classification {
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

export async function classifyItems(data: PromptData[]): Promise<Classification[]> {
  const all: Classification[] = [];

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const batch = data.slice(i, i + CHUNK_SIZE);

    const batchPrompts = batch.map(d => {
      const content = d.intro.length > MAX_CONTENT_LENGTH 
        ? d.intro.substring(0, MAX_CONTENT_LENGTH) + '... [CONTENIDO RECORTADO]' 
        : d.intro;
      return `ID: ${d.id}\nTÍTULO: ${d.titulo}\nCONTENIDO:\n${content}`;
    }).join('\n\n---\n\n');

    const prompt = `
INSTRUCCIONES:
Clasifica cada cambio normativo como si fuera un parche de videojuego:
- BUFF: Beneficia a ciudadanos/empresas.
- NERF: Afecta negativamente.
- ACTUALIZACIÓN: Ajustes técnicos sin gran impacto.

Asigna relevancia nacional **cualquier número entero entre 1 y 100** (no abuses de múltiplos de 5).

EJEMPLOS:
1. “Ley 10/2025, de 15 de mayo, de deducción en el IRPF para alquiler de vivienda de personas jóvenes”  
   → BUFF. 75  

2. “Real Decreto-ley 12/2025, de 20 de mayo, por el que se establece un nuevo impuesto sobre bebidas azucaradas”  
   → NERF. 62  

3. “Acuerdo de 5 de junio de 2025, entre España y Noruega, de reconocimiento mutuo de títulos universitarios”  
   → ACTUALIZACIÓN. 20

${batchPrompts}

Para CADA ítem:
1. Clasifica (BUFF/NERF/ACTUALIZACIÓN)
2. Resumen 1 línea (¿Quién y cómo afecta?)
3. Relevancia **1–100** (elige cualquier entero, no redondees a múltiplos de 5)

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "results": [
    {
      "id": "ID_del_item",
      "tipo": "buff|nerf|actualización",
      "summary": "Resumen breve del impacto",
      "relevance": número_entero_1_a_100
    }
  ]
}`;

    try {
      const result = await retryWithDifferentKey(async (groq) => {
        const res = await groq.chat.completions.create({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 2000,
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
        console.warn(`Algunos resultados del batch ${i}-${i+CHUNK_SIZE} no pasaron validación`);
      }

      all.push(...validResults);
    } catch (e: any) {
      console.error(`Error en classifyItems (batch ${i}-${i+CHUNK_SIZE}):`, e.message);
      if (e.message.match(/rate limit|429/gi)) {
        await sleep(PAUSE_MS * 2);
        i -= CHUNK_SIZE;
        continue;
      }
    }

    await sleep(PAUSE_MS);
  }

  return all;
}

/**
 * Lee los JSON ya generados en data/json/[date] y los clasifica.
 */
export async function classifyFromJSONFiles(date: string): Promise<Classification[]> {
  const jsonDir = path.join(process.cwd(), 'data', 'json', date);
  if (!fs.existsSync(jsonDir)) {
    console.error(`Directorio no encontrado: ${jsonDir}`);
    return [];
  }

  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  const promptData: PromptData[] = [];

  for (const file of files) {
    const filePath = path.join(jsonDir, file);
    try {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      promptData.push({
        id:    jsonData.ID,
        titulo: jsonData.TITULO,
        intro:  jsonData.CONTENIDO
      });
    } catch (e: any) {
      console.error(`Error procesando ${filePath}:`, e.message);
    }
  }

  return classifyItems(promptData);
}
