import Header from '../../components/Header';

export default function Acerca() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
            Acerca de Patch Legislativo
          </h1>
          
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">¿Qué es Patch Legislativo?</h2>
              <p className="text-gray-600 leading-relaxed">
                Patch Legislativo es una herramienta de periodismo objetivo que analiza y clasifica 
                los cambios normativos publicados en el Boletín Oficial del Estado (BOE) utilizando 
                terminología de videojuegos para hacer más accesible la información legislativa.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Metodología</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Utilizamos inteligencia artificial para analizar automáticamente cada documento 
                publicado en el BOE y clasificarlo según su impacto:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="w-20 px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-100 mr-3">
                    BUFF
                  </span>
                  Cambios que mejoran o benefician a ciudadanos o sectores
                </li>
                <li className="flex items-center">
                  <span className="w-20 px-3 py-1 rounded-full text-sm font-medium text-red-600 bg-red-100 mr-3">
                    NERF
                  </span>
                  Cambios que restringen o perjudican a ciudadanos o sectores
                </li>
                <li className="flex items-center">
                  <span className="w-20 px-3 py-1 rounded-full text-sm font-medium text-blue-600 bg-blue-100 mr-3">
                    UPDATE
                  </span>
                  Actualizaciones técnicas o cambios neutros
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Objetividad</h2>
              <p className="text-gray-600 leading-relaxed">
                Esta herramienta no emite opiniones políticas ni juicios de valor. Se limita a 
                analizar objetivamente el contenido de las normas y clasificarlas según su 
                impacto directo en la ciudadanía, utilizando criterios técnicos y análisis 
                automatizado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Tecnología</h2>
              <p className="text-gray-600 leading-relaxed">
                El sistema descarga automáticamente los documentos del BOE, los procesa mediante 
                modelos de lenguaje avanzados y almacena únicamente aquellos clasificados como 
                BUFF o NERF para facilitar su consulta y análisis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Fuentes</h2>
              <p className="text-gray-600 leading-relaxed">
                Todos los datos provienen directamente del{' '}
                <a 
                  href="https://www.boe.es" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Boletín Oficial del Estado
                </a>
                , la fuente oficial de publicación de las normas en España.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
