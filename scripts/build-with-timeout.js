const { spawn } = require('child_process')

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const timeoutMs = Number(process.env.BUILD_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)

if (Number.isNaN(timeoutMs) || timeoutMs <= 0) {
  console.warn(
    `Invalid BUILD_TIMEOUT_MS value "${process.env.BUILD_TIMEOUT_MS}", falling back to ${DEFAULT_TIMEOUT_MS}ms`
  )
}

const effectiveTimeout = !Number.isNaN(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS

const child = spawn('next', ['build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
})

let forced = false

const timeout = setTimeout(() => {
  forced = true
  console.error(
    `Build exceeded ${effectiveTimeout}ms (BUILD_TIMEOUT_MS). Terminating "next build"...`
  )
  child.kill('SIGTERM')

  setTimeout(() => {
    if (!child.killed) {
      child.kill('SIGKILL')
    }
  }, 5000)
}, effectiveTimeout)

const handleExit = (code, signal) => {
  clearTimeout(timeout)

  if (signal && signal !== 'SIGTERM') {
    process.exitCode = 1
    console.error(`Build terminated by signal ${signal}`)
    return
  }

  if (forced) {
    process.exitCode = 1
    console.error('Build aborted due to timeout')
    return
  }

  process.exitCode = code ?? 0
}

child.on('close', handleExit)

const forward = (sig) => {
  child.kill(sig)
}

process.on('SIGINT', forward)
process.on('SIGTERM', forward)

