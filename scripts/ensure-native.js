const { spawnSync } = require('child_process')
const path = require('path')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options
  })

  return typeof result.status === 'number' ? result.status : 1
}

function checkBetterSqlite3WithElectron() {
  // The `electron` package exports the absolute path to the Electron executable.
  // Using the .exe directly avoids cmd/bash quoting pitfalls (notably `&&`).
  const electronBin = require('electron')
  const code =
    "try{require('better-sqlite3');process.exit(0);}catch(e){console.error(e&&e.stack?e.stack:e);process.exit(1);}"
  const status = run(
    electronBin,
    [
      '-e',
      code
    ],
    {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    }
  )

  return status === 0
}

function rebuildBetterSqlite3() {
  const rebuildCli = path.join(__dirname, '..', 'node_modules', '@electron', 'rebuild', 'lib', 'cli.js')
  return run(process.execPath, [rebuildCli, '-f', '-w', 'better-sqlite3'])
}

function main() {
  if (checkBetterSqlite3WithElectron()) {
    console.log('[native] better-sqlite3 OK (Electron ABI match)')
    return
  }

  console.warn('[native] better-sqlite3 not compatible with current Electron; rebuilding...')
  const rebuildStatus = rebuildBetterSqlite3()
  if (rebuildStatus !== 0) {
    process.exit(rebuildStatus)
  }

  if (!checkBetterSqlite3WithElectron()) {
    console.error('[native] rebuild finished but better-sqlite3 still failed to load in Electron')
    process.exit(1)
  }

  console.log('[native] rebuild success')
}

main()
