#!/usr/bin/env node
// Runs the whole backend test-suite against a throw-away Worker + SQLite database:
//   npm test
// It never touches your real local database (it uses a temporary folder) and cleans up after itself.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { state } from './helpers.mjs'

const root = path.resolve(import.meta.dirname, '..')
const persist = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-test-'))
const only = process.argv[2] // optional: "api", "security", "hardening", "browser", "parity" or "https"

// Tests need the local secrets (first admin + pepper). Use .dev.vars, or fall back to the example file for this run only.
const devVars = path.join(root, '.dev.vars')
const created = !fs.existsSync(devVars)
if (created) fs.copyFileSync(path.join(root, '.dev.vars.example'), devVars)

// The website addresses the API will talk to in these tests (see tests/helpers.mjs: SITE).
const ORIGINS = 'ALLOWED_ORIGINS:https://shop.example.test,http://localhost:5173,http://localhost:5184'

const run = (args) => spawnSync('npx', ['wrangler', ...args], { cwd: root, encoding: 'utf8' })

let server
let code = 1
async function startServer(port, extra = []) {
  const child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', persist, '--var', ORIGINS, ...extra], { cwd: root, stdio: 'ignore', detached: true })
  const proto = extra.includes('https') ? 'https' : 'http'
  const base = `${proto}://127.0.0.1:${port}`
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { child, base }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Worker did not start on port ${port}`)
}
const stop = (s) => { try { if (s) process.kill(-s.child.pid, 'SIGTERM') } catch { /* already stopped */ } }
/** wrangler starts the real server (workerd) in its own process group, so also stop whatever still listens on the test ports. */
function freePorts(ports) {
  const out = spawnSync('ss', ['-ltnp'], { encoding: 'utf8' }).stdout ?? ''
  for (const line of out.split('\n')) {
    if (!ports.some((p) => line.includes(`:${p} `))) continue
    for (const m of line.matchAll(/pid=(\d+)/g)) { try { process.kill(Number(m[1]), 'SIGTERM') } catch { /* gone */ } }
  }
}
const TEST_PORTS = [8799, 8798, 9391, 5184, 5185]

freePorts(TEST_PORTS) // a previous crashed run may have left servers behind
try {
  console.log('Preparing a temporary database …')
  const mig = run(['d1', 'migrations', 'apply', 'raut-traders', '--local', '--persist-to', persist])
  if (mig.status !== 0) throw new Error('migration failed:\n' + mig.stdout + mig.stderr)

  server = await startServer(8799)
  globalThis.TEST_CTX = { base: server.base, persist, root, run }
  if (!only || only === 'api') await import('./api.test.mjs')
  if (!only || only === 'security') await import('./security.test.mjs')
  if (!only || only === 'hardening') await import('./hardening.test.mjs')
  if (!only || only === 'browser') await import('./browser.test.mjs')
  if (!only || only === 'parity') await import('./parity.test.mjs')
  stop(server)
  server = null

  if (!only || only === 'https') {
    // Second pass over HTTPS (self-signed certificate) to check Secure cookies and HSTS.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    const https = await startServer(8798, ['--local-protocol', 'https'])
    globalThis.TEST_CTX = { base: https.base, persist, root, run }
    try {
      await import('./https.test.mjs')
    } finally {
      stop(https)
    }
  }
  console.log(`\n${state.pass} passed, ${state.fail} failed`)
  if (state.fail) console.log('\nFailed:\n  ' + state.failures.join('\n  '))
  code = state.fail ? 1 : 0
} catch (e) {
  console.error(e)
} finally {
  stop(server)
  freePorts(TEST_PORTS)
  if (created) fs.unlinkSync(devVars)
  fs.rmSync(persist, { recursive: true, force: true })
  process.exit(code)
}
