import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev; connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev wss://*.clerk.com; frame-src 'self'; worker-src 'self' blob:; img-src 'self' data: https://img.clerk.com; style-src 'self' 'unsafe-inline';"
  }
];

const nextConfig: NextConfig = {
  output: process.env.VERCEL === '1' ? undefined : 'standalone',
  async rewrites() {
    return [
      {
        source: '/__clerk/:path*',
        destination: '/clerk-proxy/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  }
};

export default nextConfig;
