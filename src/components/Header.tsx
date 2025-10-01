import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-800 hover:text-blue-600">
            🇪🇸 Patch Legislativo
          </Link>
          
          <nav className="flex space-x-6">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Inicio
            </Link>
            <Link 
              href="/acerca" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Acerca
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
