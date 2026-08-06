export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.dev; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.clerk.dev;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=self, microphone=self, geolocation=()',
};

export function applySecurityHeaders(res: Response | any) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (res.headers && typeof res.headers.set === 'function') {
      res.headers.set(key, value);
    } else if (res.setHeader) {
      res.setHeader(key, value);
    }
  });
  return res;
}
