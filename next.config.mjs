/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera uma versão enxuta para rodar no Docker
  output: 'standalone',
  poweredByHeader: false,
  // Endereço antigo do estúdio
  async redirects() {
    return [
      { source: '/studio', destination: '/', permanent: true },
      // A aba Áudio saiu: o áudio vem do app do ElevenLabs e entra pelo Lip Sync
      { source: '/audio', destination: '/lipsync', permanent: false },
    ];
  },
};

export default nextConfig;
