// Starts the API server and the Vite dev server together (works on Windows, macOS and Linux).
import { spawn } from 'node:child_process'

const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
const api = run(process.execPath, ['server/index.mjs'])
const web = run('npx', ['vite'])
const stop = () => {
  api.kill()
  web.kill()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
api.on('exit', stop)
web.on('exit', stop)
