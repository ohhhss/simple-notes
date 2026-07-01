import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

const LOG_FILE = join(app.getPath('userData'), 'app.log')
const MAX_LOG_SIZE = 2 * 1024 * 1024 // 2MB

type LogLevel = 'info' | 'warn' | 'error'

function formatMsg(level: LogLevel, msg: string, extra?: unknown): string {
  const ts = new Date().toISOString()
  const extraStr = extra !== undefined ? ' ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''
  return `[${ts}] [${level.toUpperCase()}] ${msg}${extraStr}`
}

export const logger = {
  async info(msg: string, extra?: unknown) {
    const line = formatMsg('info', msg, extra)
    console.log(line)
    this.appendLog(line).catch(() => {})
  },
  async warn(msg: string, extra?: unknown) {
    const line = formatMsg('warn', msg, extra)
    console.warn(line)
    this.appendLog(line).catch(() => {})
  },
  async error(msg: string, extra?: unknown) {
    const line = formatMsg('error', msg, extra)
    console.error(line)
    this.appendLog(line).catch(() => {})
  },
  async appendLog(line: string) {
    try {
      // Rotate log if too large
      try {
        const stat = await fs.stat(LOG_FILE)
        if (stat.size > MAX_LOG_SIZE) {
          await fs.writeFile(LOG_FILE, '', 'utf-8')
        }
      } catch { /* file doesn't exist yet */ }
      await fs.appendFile(LOG_FILE, line + '\n', 'utf-8')
    } catch { /* ignore write errors */ }
  }
}
