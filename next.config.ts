import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return { beforeFiles: [
      { source: '/', destination: '/index.html' },
      { source: '/diagnostico', destination: '/campanhas_vigentes/diagnostico/index.html' },
      { source: '/diagnostico/', destination: '/campanhas_vigentes/diagnostico/index.html' },
    ], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }];
  },
};
export default config;
