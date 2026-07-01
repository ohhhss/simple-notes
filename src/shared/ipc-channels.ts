/**
 * Centralized IPC channel name constants.
 * All IPC communication between main process, preload, and renderer
 * must use these constants instead of magic string literals.
 */
export const IPC_CHANNELS = {
  // App data (unified storage)
  APP_LOAD: 'app:load',
  APP_SAVE: 'app:save',

  // Notes (legacy backward-compat)
  NOTES_LOAD: 'notes:load',
  NOTES_SAVE: 'notes:save',

  // Categories (legacy backward-compat)
  CATEGORIES_LOAD: 'categories:load',
  CATEGORIES_SAVE: 'categories:save',

  // Theme
  THEME_GET: 'theme:get',
  THEME_SET: 'theme:set',

  // View mode
  VIEWMODE_GET: 'viewmode:get',
  VIEWMODE_SET: 'viewmode:set',

  // Split ratio
  SPLITRATIO_GET: 'splitratio:get',
  SPLITRATIO_SET: 'splitratio:set',

  // File operations
  NOTE_EXPORT: 'note:export',
  FILE_OPEN: 'file:open',
  FILE_OPEN_BY_PATH: 'file:open-by-path',

  // System notification
  NOTIFY_SHOW: 'notify:show',

  // Config backup
  CONFIG_EXPORT: 'config:export',
  CONFIG_IMPORT: 'config:import',

  // Menu → renderer events (main sends to renderer)
  MENU_NEW_NOTE: 'menu:new-note',
  MENU_NEW_FILE: 'menu:new-file',
  MENU_OPEN_FILE: 'menu:open-file',
  MENU_SAVE: 'menu:save',
  MENU_TOGGLE_THEME: 'menu:toggle-theme',
  MENU_EXPORT: 'menu:export',
  MENU_VIEWMODE: 'menu:viewmode',
  MENU_SEARCH: 'menu:search',
  MENU_EXPORT_CONFIG: 'menu:export-config',
  MENU_IMPORT_CONFIG: 'menu:import-config',

  // File dropped event
  FILE_DROPPED: 'file:dropped'
} as const

/** Allowed file extensions for import operations */
export const ALLOWED_IMPORT_EXTENSIONS = ['.md', '.txt', '.docx'] as const

/** Allowed export formats */
export const ALLOWED_EXPORT_FORMATS = ['md', 'txt', 'docx'] as const

/** IPC call timeout in milliseconds */
export const IPC_TIMEOUT_MS = 10000

/** Check if a file extension is allowed for import */
export function isAllowedImportExtension(ext: string): boolean {
  return (ALLOWED_IMPORT_EXTENSIONS as readonly string[]).includes(ext.toLowerCase())
}

/** Check if an export format is valid */
export function isAllowedExportFormat(format: string): boolean {
  return (ALLOWED_EXPORT_FORMATS as readonly string[]).includes(format)
}
