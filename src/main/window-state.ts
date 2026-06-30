import { BrowserWindow } from 'electron'
import { promises as fs, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface WindowState {
  width?: number
  height?: number
  x?: number
  y?: number
  isMaximized?: boolean
}

function getStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

export function restoreWindowState(): WindowState {
  try {
    const data = readFileSync(getStatePath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

export async function saveWindowState(win: BrowserWindow): Promise<void> {
  try {
    const isMaximized = win.isMaximized()
    const bounds = win.getBounds()
    const state: WindowState = isMaximized
      ? { isMaximized: true }
      : { ...bounds, isMaximized: false }
    await fs.writeFile(getStatePath(), JSON.stringify(state), 'utf-8')
  } catch {
    // 忽略状态保存错误
  }
}
