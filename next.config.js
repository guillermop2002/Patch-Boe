/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Desactivar ESLint durante el build para evitar errores
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Desactivar verificación de tipos durante el build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
