/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['studio'],
  // Gera uma versão enxuta para rodar no Docker
  output: 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
