import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load env variables from the repo root so frontend can read the main .env
  // Only variables prefixed with VITE_ are exposed to the client bundle
  envDir: '..',
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5178,
    // Security headers for development server
    // These address OWASP ZAP findings for the frontend
    // Note: 'unsafe-inline' and 'unsafe-eval' are REQUIRED for Vite HMR in development
    headers: {
      // Content Security Policy - Development mode (permissive for HMR)
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Required for Vite HMR
        "style-src 'self' 'unsafe-inline'",  // Required for CSS-in-JS
        "img-src 'self' data: blob:",  // Removed https: wildcard
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*",
        "frame-ancestors 'self'",
        "form-action 'self'",  // Restricts form submissions
        "base-uri 'self'",  // Restricts <base> tag
        "object-src 'none'"  // Blocks plugins
      ].join('; '),
      // X-Frame-Options - Prevents clickjacking
      'X-Frame-Options': 'SAMEORIGIN',
      // X-Content-Type-Options - Prevents MIME sniffing
      'X-Content-Type-Options': 'nosniff',
      // X-XSS-Protection - Additional XSS protection
      'X-XSS-Protection': '1; mode=block',
      // Referrer-Policy - Controls referrer info
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Permissions-Policy - Restricts browser features
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
  },
  // Production build security headers (for preview server)
  preview: {
    headers: {
      // Stricter CSP for production - no unsafe-eval
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",  // Strict - no inline or eval
        "style-src 'self' 'unsafe-inline'",  // May need for some CSS
        "img-src 'self' data: blob:",  // No wildcards
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests"
      ].join('; '),
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  },
})
