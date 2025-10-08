export default function Acerca() {
  return (
    <main className="container">
      {/* Navegación */}
      <div className="text-center mb-6">
        <a
          href="/"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          🏠 Inicio
        </a>
      </div>

      <h1 className="main-title">
        Acerca de Parche Legislativo
      </h1>
      
      <div className="search-card">
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">¿Qué es Parche Legislativo?</h2>
          <p className="text-gray-600 leading-relaxed">
            Parche Legislativo es una herramienta de periodismo objetivo que analiza y clasifica 
            los cambios normativos publicados en el Boletín Oficial del Estado (BOE) utilizando 
            terminología de videojuegos para hacer más accesible la información legislativa.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Metodología</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Utilizamos inteligencia artificial para analizar automáticamente cada documento 
            publicado en el BOE y clasificarlo según su impacto:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <span className="text-white font-bold text-xl">🔼</span>
                </div>
                <h3 className="font-bold text-green-800 mb-2">BUFF</h3>
                <p className="text-green-700 text-sm">
                  Cambios que mejoran o benefician a ciudadanos o sectores
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4">
                  <span className="text-white font-bold text-xl">🔽</span>
                </div>
                <h3 className="font-bold text-red-800 mb-2">NERF</h3>
                <p className="text-red-700 text-sm">
                  Cambios que restringen o perjudican a ciudadanos o sectores
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
                  <span className="text-white font-bold text-xl">⚙️</span>
                </div>
                <h3 className="font-bold text-blue-800 mb-2">ACTUALIZACIÓN</h3>
                <p className="text-blue-700 text-sm">
                  Actualizaciones técnicas o cambios neutros
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Objetividad</h2>
          <p className="text-gray-600 leading-relaxed">
            Esta herramienta no emite opiniones políticas ni juicios de valor. Se limita a 
            analizar objetivamente el contenido de las normas y clasificarlas según su 
            impacto directo en la ciudadanía, utilizando criterios técnicos y análisis 
            automatizado.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Tecnología</h2>
          <p className="text-gray-600 leading-relaxed">
            El sistema descarga automáticamente los documentos del BOE, los procesa mediante 
            modelos de lenguaje avanzados y almacena únicamente aquellos clasificados como 
            BUFF o NERF para facilitar su consulta y análisis.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Fuentes</h2>
          <p className="text-gray-600 leading-relaxed">
            Todos los datos provienen directamente del{' '}
            <a 
              href="https://www.boe.es" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Boletín Oficial del Estado
            </a>
            , la fuente oficial de publicación de las normas en España.
          </p>
        </section>
      </div>
    </main>
  );
}
