import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { join } from 'path'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

let app: ElectronApplication
let userDataDir: string

test.beforeAll(async () => {
  userDataDir = mkdtempSync(join(tmpdir(), 'mark-notes-test-'))
  app = await electron.launch({
    args: [join(__dirname, '../out/main/index.js')],
    env: {
      ...process.env,
      ELECTRON_USER_DATA_PATH: userDataDir
    }
  })
})

test.afterAll(async () => {
  await app.close()
})

test('launches and shows window with correct title', async () => {
  const page = await app.firstWindow()
  await expect(page).toHaveTitle(/马克笔记/)
  await expect(page.locator('text=选择一条笔记或点击新建')).toBeVisible()
})

test('can create a new note via button', async () => {
  const page = await app.firstWindow()
  await page.click('text=+ 新建')
  await expect(page.locator('[data-testid="title-input"]')).toBeVisible()
})

test('can type content and see saved indicator', async () => {
  const page = await app.firstWindow()
  await page.click('text=+ 新建')
  await page.fill('[data-testid="title-input"]', 'E2E测试标题')
  await page.fill('[data-testid="content-input"]', 'E2E测试内容')
  await page.waitForTimeout(800)
  await expect(page.locator('text=已保存')).toBeVisible()
})

test('Ctrl+N shortcut creates a new note', async () => {
  const page = await app.firstWindow()
  await page.keyboard.press('Control+N')
  await expect(page.locator('[data-testid="title-input"]')).toBeFocused()
})
