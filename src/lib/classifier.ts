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
const CHUNK_SIZE = 3; // Reducido para evitar límites de tokens (12000 TPM)
const PAUSE_MS = 2000; // Aumentado para evitar rate limits
const MAX_CONTENT_LENGTH = 6000; // Reducido para evitar exceso de tokens

// MODO DE PRUEBA: Limitar a 20 documentos para evitar rate limit durante pruebas
// IMPORTANTE: Cambiar a 0 para procesar TODOS los documentos en producción
const TEST_MODE_LIMIT = 0; // 0 = sin límite, >0 = limitar a N documentos

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
  categoria: string;
  summary: string;
  relevance: number;
}

function validateClassification(result: any): result is ClassificationResult {
  const validTypes = ['buff','nerf','actualización'];
  const validCategorias = [
    'NormasYDisposiciones',
    'DisposicionesAdministrativas',
    'ActosIndividuales',
    'AnunciosEdictosNotificaciones',
    'ContratacionPublica',
    'ConvocatoriasEmpleoPublico',
    'SubvencionesAyudas',
    'FiscalidadPresupuestos',
    'RegistrosPropiedadMercantil',
    'Jurisprudencia',
    'NormativaInternacionalUE',
    'CorreccionesRectificaciones',
    'InformesEstadisticas',
    'TransparenciaFiscalizacion',
    'ConcursosYProcedimientos',
    'SectorialesTecnicos',
    'ComunicadosInstitucionales',
    'PublicidadLegal',
    'MedidasEmergencia',
    'Otros'
  ];
  
  // Normalizar tipo a minúsculas
  if (result.tipo) {
    result.tipo = result.tipo.toLowerCase();
  }
  
  return (
    validTypes.includes(result.tipo) &&
    typeof result.categoria === 'string' &&
    validCategorias.includes(result.categoria) &&
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

⚠️ CRÍTICO: Sé ESTRICTO pero EQUILIBRADO. El 75% de documentos del BOE son cambios administrativos menores, pero algunos sí tienen impacto sectorial o nacional.

CRITERIOS DE CLASIFICACIÓN:
- **BUFF**: Medidas que benefician, mejoran condiciones o amplían derechos (con relevancia nacional o sectorial significativa)
- **NERF**: Medidas que restringen, endurecen condiciones o reducen beneficios (con relevancia nacional o sectorial significativa)
- **ACTUALIZACIÓN**: Cambios técnicos, administrativos, nombramientos, convocatorias locales, correcciones, etc.

🔴 REGLA EQUILIBRADA: Si un documento tiene impacto sectorial significativo o afecta a grupos amplios, puede ser BUFF/NERF. Solo ACTUALIZACIÓN si es puramente administrativo.

📋 CATEGORÍAS DEL BOE (clasifica cada documento en UNA categoría exacta):

1. **NormasYDisposiciones**: Leyes, decretos, órdenes ministeriales, reglamentos
2. **DisposicionesAdministrativas**: Circulares, instrucciones, resoluciones generales
3. **ActosIndividuales**: Nombramientos, resoluciones individuales, decisiones específicas
4. **AnunciosEdictosNotificaciones**: Edictos, notificaciones públicas, anuncios registrales
5. **ContratacionPublica**: Concursos públicos, adjudicaciones, contratos administrativos
6. **ConvocatoriasEmpleoPublico**: Ofertas de empleo público, listas de aprobados
7. **SubvencionesAyudas**: Convocatorias de ayudas, resoluciones de concesión
8. **FiscalidadPresupuestos**: Cuentas públicas, modificaciones presupuestarias, instrucciones tributarias
9. **RegistrosPropiedadMercantil**: Asientos registrales, constitución de sociedades, marcas
10. **Jurisprudencia**: Resoluciones de tribunales, sentencias de interés general
11. **NormativaInternacionalUE**: Trasposición de directivas, tratados internacionales
12. **CorreccionesRectificaciones**: Corrección de erratas, rectificaciones de normas
13. **InformesEstadisticas**: Informes oficiales, memorias, estadísticas públicas
14. **TransparenciaFiscalizacion**: Cuentas de organismos, informes de control
15. **ConcursosYProcedimientos**: Concursos de acreedores, procedimientos concursales
16. **SectorialesTecnicos**: Regulaciones técnicas, normas sectoriales específicas
17. **ComunicadosInstitucionales**: Declaraciones institucionales, actos protocolarios
18. **PublicidadLegal**: Avisos legales, publicaciones obligatorias
19. **MedidasEmergencia**: Decretos de emergencia, medidas extraordinarias
20. **Otros**: Publicaciones atípicas que no encajen en las anteriores

ESCALA DE RELEVANCIA (1-100) - EQUILIBRADA:
- **95-100**: Reformas constitucionales, presupuestos generales del Estado, leyes orgánicas fundamentales
  Ejemplo: "Ley Orgánica de reforma del Código Penal" → 97
  ⚠️ ~0.5% de documentos deberían estar aquí

- **85-94**: Leyes nacionales importantes, reformas fiscales mayores, cambios en derechos fundamentales
  Ejemplo: "Real Decreto-ley de subida del salario mínimo interprofesional" → 88
  ⚠️ ~1% de documentos deberían estar aquí

- **70-84**: Cambios significativos en sectores importantes (sanidad, educación, empleo a nivel nacional)
  Ejemplo: "Real Decreto de nuevas prestaciones por desempleo" → 76
  ⚠️ ~3% de documentos deberían estar aquí

- **55-69**: Regulaciones sectoriales moderadas, afectan a sectores específicos pero amplios
  Ejemplo: "Orden de nuevas ayudas para autónomos" → 62
  ⚠️ ~5% de documentos deberían estar aquí

- **40-54**: Cambios administrativos con impacto limitado, regulaciones de nicho
  Ejemplo: "Resolución de bases reguladoras de subvenciones para cooperativas agrarias" → 48
  ⚠️ ~8% de documentos deberían estar aquí

- **25-39**: Convocatorias de empleo público, nombramientos importantes, correcciones menores
  Ejemplo: "Convocatoria de 50 plazas de funcionarios del Ministerio X" → 32
  ⚠️ ~12% de documentos pueden estar aquí

- **10-24**: Nombramientos individuales, correcciones de erratas, anuncios administrativos
  Ejemplo: "Nombramiento de Director General de la Agencia X" → 18
  ⚠️ ~20% de documentos pueden estar aquí

- **1-9**: Cambios puramente técnicos, correcciones tipográficas, anuncios sin impacto
  Ejemplo: "Corrección de errores en la Orden de 15 de marzo" → 5
  ⚠️ ~50% de documentos deberían estar aquí
  ⚠️ ~15% de documentos pueden estar aquí

EJEMPLOS CONCRETOS DE CLASIFICACIÓN EQUILIBRADA:

1. "Convocatoria de 200 plazas de Policía Nacional"
   → BUFF, ConvocatoriasEmpleoPublico, relevancia: 32 (afecta a aspirantes y mejora seguridad)

2. "Modificación del convenio ICO para facilidades de financiación empresarial"
   → BUFF, SubvencionesAyudas, relevancia: 45 (ayuda a empresas, sectorial importante)

3. "Admisión a trámite de recurso de inconstitucionalidad contra ley autonómica"
   → ACTUALIZACIÓN, Jurisprudencia, relevancia: 15 (es un trámite procesal)

4. "Nombramiento de Secretario General Técnico del Ministerio de Cultura"
   → ACTUALIZACIÓN, ActosIndividuales, relevancia: 8 (nombramiento individual)

5. "Real Decreto de aumento de pensiones mínimas en 50€/mes"
   → BUFF, NormasYDisposiciones, relevancia: 78 (afecta a millones de pensionistas - IMPACTO NACIONAL)

6. "Orden de exclusión de 3 deportistas de ayudas por dopaje"
   → ACTUALIZACIÓN, SubvencionesAyudas, relevancia: 3 (afecta solo a 3 personas específicas)

7. "Real Decreto de nuevas medidas de apoyo a la industria automotriz"
   → BUFF, SectorialesTecnicos, relevancia: 52 (sectorial importante)

8. "Convocatoria de ayudas para jóvenes agricultores"
   → BUFF, SubvencionesAyudas, relevancia: 35 (sectorial moderado)

DOCUMENTOS A ANALIZAR:
${batchPrompts}

INSTRUCCIONES EQUILIBRADAS:
1. Sé CONSERVADOR con las puntuaciones altas (70+): reserva para impacto nacional real
2. El 75% de documentos deberían ser ACTUALIZACIÓN, 25% BUFF/NERF
3. Clasifica como BUFF/NERF si hay impacto sectorial significativo o nacional
4. USA VALORES ÚNICOS Y VARIADOS del 1-100: 3, 7, 12, 18, 23, 28, 35, 42, etc.
5. EVITA PUNTUACIONES REPETIDAS: Si ya usaste 25, usa 23, 27, 29, 31, etc.
6. Nombramientos individuales, correcciones menores → ACTUALIZACIÓN
7. Convocatorias sectoriales, ayudas específicas → BUFF/NERF según impacto
8. Si dudas entre buff/nerf y actualización → evalúa el impacto sectorial
9. DISTRIBUYE las puntuaciones: 50% en 1-9, 20% en 10-24, 12% en 25-39, etc.
10. IMPORTANTE: Si un documento tiene algún impacto sectorial o afecta a grupos específicos, clasifícalo como BUFF/NERF, no como ACTUALIZACIÓN

Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicaciones):
{
  "results": [
    {
      "id": "ID_del_documento",
      "tipo": "buff|nerf|actualización",
      "categoria": "categoria_exacta_de_la_lista",
      "summary": "Resumen conciso del impacto real",
      "relevance": número_entero_específico_1_a_100
    }
  ]
}`;

    try {
      console.log(`🤖 Clasificando lote ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(data.length/CHUNK_SIZE)} (${batch.length} items)...`);
      
      // Validar tamaño del prompt antes de enviar
      if (!validatePromptSize(prompt, 10000)) {
        console.log(`⚠️  Reduciendo lote de ${batch.length} a 2 items para evitar límite de tokens...`);
        // Si el prompt es demasiado grande, procesar solo 2 items
        const reducedBatch = batch.slice(0, 2);
        const reducedPrompts = reducedBatch.map(item => 
          `ID: ${item.id}\nTítulo: ${(item as any).title}\nContenido: ${(item as any).content.substring(0, MAX_CONTENT_LENGTH)}`
        ).join('\n\n---\n\n');
        
        const reducedPrompt = prompt.replace(batchPrompts, reducedPrompts);
        if (!validatePromptSize(reducedPrompt, 10000)) {
          console.log(`❌ Error: Incluso con 2 items el prompt es demasiado grande. Saltando lote.`);
          continue;
        }
        
        // Usar el prompt reducido
        const result = await retryWithDifferentKey(async (groq) => {
          const res = await groq.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: reducedPrompt }],
            temperature: 0.1,
            max_tokens: 4000,
          });

          const content = res.choices[0]?.message?.content;
          if (!content) throw new Error('La IA no retornó contenido');

          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No se encontró JSON válido en la respuesta');

          const payload = JSON.parse(jsonMatch[0]);
          if (!payload.results || !Array.isArray(payload.results)) {
            throw new Error('Formato de respuesta inválido');
          }

          return payload.results;
        });
        
        // Procesar solo los resultados del lote reducido
        for (const resultItem of result) {
          const item = reducedBatch.find(b => b.id === resultItem.id);
          if (item) {
            all.push({
              id: resultItem.id,
              tipo: resultItem.tipo,
              categoria: resultItem.categoria,
              summary: resultItem.summary,
              relevance: resultItem.relevance
            });
          }
        }
        continue;
      }
      
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
        console.log(`  ${emoji} ${r.tipo.toUpperCase()} (${r.relevance}/100) [${r.categoria}]: ${r.summary.substring(0, 80)}...`);
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
          categoria: classification.categoria,
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
