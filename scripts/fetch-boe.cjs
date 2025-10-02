// scripts/fetch-boe.cjs

const fs   = require('fs/promises')
const path = require('path')
const fetch = globalThis.fetch  // Node 18+

// Formatea Date → "YYYYMMDD"
function formatDate(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()   ).padStart(2,'0')
  return `${y}${m}${dd}`
}

// Leer argv[2] o "today"
let fecha = process.argv[2]
if (fecha === 'today') fecha = formatDate(new Date())
if (!/^\d{8}$/.test(fecha)) {
  console.error("❌ Usa: npm run fetch-boe YYYYMMDD   o   npm run fetch-boe:today")
  process.exit(1)
}

const xmlDir  = path.join('data','xml',  fecha)
const jsonDir = path.join('data','json', fecha)

async function fetchBOE(fecha) {
  // 0) Si ya existe xmlDir con algo → parar
  try {
    const files = await fs.readdir(xmlDir)
    if (files.length) {
      console.log(`🟡 Ya existen XMLs para ${fecha}, no hago nada.`)
      return
    }
  } catch { /* no existía, seguimos */ }

  // 1) Descargar sumario JSON
  const sumUrl = `https://www.boe.es/datosabiertos/api/boe/sumario/${fecha}`
  console.log(`🔎 Descargando sumario JSON de ${fecha}...`)
  const sumRes = await fetch(sumUrl, { headers:{ Accept:'application/json' } })
  if (!sumRes.ok) {
    console.error(`❌ Error ${sumRes.status} al descargar sumario`)
    return
  }
  const sumJson = await sumRes.json()

  // 2) Extraer todos los items (id + url_xml)
  let diariosNode = sumJson.data?.sumario?.diario
                   || sumJson.ListadoSumario?.sumario
                   || []
  const diarios = Array.isArray(diariosNode) ? diariosNode : [diariosNode]
  const allItems = []
  for (const d of diarios) {
    const secciones = Array.isArray(d.seccion) ? d.seccion : [d.seccion]
    for (const sec of secciones) {
      if (!sec.departamento) continue
      const deps = Array.isArray(sec.departamento) ? sec.departamento : [sec.departamento]
      for (const dept of deps) {
        if (!dept.epigrafe) continue
        const epis = Array.isArray(dept.epigrafe) ? dept.epigrafe : [dept.epigrafe]
        for (const epi of epis) {
          if (!epi.item) continue
          const items = Array.isArray(epi.item) ? epi.item : [epi.item]
          for (const it of items) {
            if (it.identificador && it.url_xml) {
              allItems.push({ id: it.identificador, url: it.url_xml })
            }
          }
        }
      }
    }
  }

  // 3) Crear directorios
  await fs.mkdir(xmlDir,  { recursive: true })
  await fs.mkdir(jsonDir, { recursive: true })

  // 4) Descargar XMLs y generar JSON individual
  const { XMLParser } = require('fast-xml-parser')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  })

  console.log(`⬇️  Descargando ${allItems.length} disposiciones...`)
  for (const { id, url } of allItems) {
    const xmlPath  = path.join(xmlDir,  `${id}.xml`)
    const jsonPath = path.join(jsonDir, `${id}.json`)

    process.stdout.write(`  • ${id}.xml … `)
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const xml = await r.text()
      await fs.writeFile(xmlPath, xml, 'utf-8')
      console.log('OK')
    } catch (e) {
      console.log(`ERR (${e.message})`)
      continue
    }

    // Parsear contenido
    const xmlContent = await fs.readFile(xmlPath, 'utf-8')
    const js = parser.parse(xmlContent).documento || {}
    const titulo = js.metadatos?.titulo?.trim() || ''

    // Extraer todos los <p> de <texto>
    const textoNode = js.texto || {}
    let ps = []
    if (Array.isArray(textoNode.p)) {
      ps = textoNode.p
    } else if (textoNode.p) {
      ps = [textoNode.p]
    }
    const paras = ps.map(p => (
      typeof p === 'string'
        ? p.trim()
        : (p['#text'] || '').trim()
    ))
    const contenido = paras.join('\n\n')

    // Escribir JSON
    const resumen = {
      ID:        id,
      TITULO:    titulo,
      CONTENIDO: contenido
    }
    await fs.writeFile(jsonPath, JSON.stringify(resumen, null, 2), 'utf-8')
  }

  console.log(`✅ XMLs en ${xmlDir}  y  JSONs en ${jsonDir}`)

  // Clasificación automática con Groq
  console.log('\n🤖 Iniciando clasificación automática...')
  try {
    // Importar dinámicamente el módulo de clasificación
    const { classifyAndSaveToDatabase } = await import('../src/lib/classifier.js')
    await classifyAndSaveToDatabase(fecha)
  } catch (error) {
    console.error('❌ Error en clasificación automática:', error.message)
    console.log('💡 Los datos JSON están disponibles, puedes clasificar manualmente más tarde')
  }
}

fetchBOE(fecha).catch(err => {
  console.error(err)
  process.exit(1)
})
