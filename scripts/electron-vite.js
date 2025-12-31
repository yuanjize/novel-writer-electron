const { spawn } = require('child_process')
const path = require('path')

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node scripts/electron-vite.js <dev|build|preview> [args...]')
    process.exit(1)
  }

  const binName = process.platform === 'win32' ? 'electron-vite.cmd' : 'electron-vite'
  const binPath = path.join(__dirname, '..', 'node_modules', '.bin', binName)

  const env = { ...process.env }
  // If this is set, Electron runs as plain Node, and `require("electron")` won't expose `app`.
  delete env.ELECTRON_RUN_AS_NODE

  const child = spawn(binPath, args, { stdio: 'inherit', env, shell: process.platform === 'win32' })
  child.on('exit', (code) => process.exit(code ?? 0))
}

main()
