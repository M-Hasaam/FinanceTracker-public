/** @type {import('next').NextConfig} */

// When NEXT_PUBLIC_BASE_PATH is set we are doing a static GitHub Pages export.
const isStaticExport = !!process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig = {
  ...(isStaticExport
    ? {
        output: 'export',
        basePath: process.env.NEXT_PUBLIC_BASE_PATH,
        images: { unoptimized: true },
      }
    : {
        allowedDevOrigins: ['http://localhost:3001'],
        /**
         * Proxy all /api/* requests to the NestJS backend.
         * This keeps cookies first-party (same origin) so httpOnly cookies
         * are never blocked as third-party cookies by the browser.
         */
        async rewrites() {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
          return [
            {
              source: '/api/:path*',
              destination: `${backendUrl}/:path*`,
            },
          ];
        },
      }),
};

export default nextConfig;
