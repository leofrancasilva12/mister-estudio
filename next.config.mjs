/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera uma versão enxuta para rodar no Docker
  output: 'standalone',
  poweredByHeader: false,
  // Endereço antigo do estúdio
  async redirects() {
    return [{ source: '/studio', destination: '/', permanent: true }];
  },
};

export default nextConfig;
