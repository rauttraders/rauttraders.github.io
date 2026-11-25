import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * GitHub Pages cannot send response headers, so the page's security policy is written into index.html as a <meta> tag
 * (production build only — the dev server needs inline scripts for hot reload). It allows scripts only from our own
 * files, so injected script code would not run, and it limits where the page may send data to: itself and the API.
 */
function securityPolicy(apiOrigin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: https:${apiOrigin ? ` ${apiOrigin}` : ''}`,
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    'frame-src https://www.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'security-policy-meta',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`) },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // In development the API and uploaded images come from the Node server (npm run server) or the Cloudflare Worker (API_URL).
  const API = process.env.API_URL ?? 'http://localhost:3001'
  let apiOrigin = ''
  try {
    apiOrigin = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : ''
  } catch {
    /* an invalid VITE_API_URL is reported by the app at run time */
  }
  return {
    // "/" for a custom domain or a user site; "/<repository-name>/" for a GitHub Pages project site (set VITE_BASE).
    base: env.VITE_BASE || '/',
    plugins: [react(), tailwindcss(), securityPolicy(apiOrigin)],
    server: { proxy: { '/api': API, '/uploads': API } },
    preview: { proxy: { '/api': API, '/uploads': API } },
  }
})
