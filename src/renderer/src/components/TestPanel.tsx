import { useEffect, useState } from 'react'
import { escapeHtml } from '../utils/escapeHtml'
import { formatTime, uid } from '../utils/formatTime'
import type { Note } from '@shared/types'

interface TestPanelProps {
  notes: Note[]
  addNote: () => string
  deleteNote: (id: string) => void
  selectNote: (id: string | null) => void
  reloadNotes: () => Promise<void>
}

interface TestResult {
  passed: number
  failed: number
  messages: string[]
}

export default function TestPanel({ notes, addNote, deleteNote, selectNote, reloadNotes }: TestPanelProps) {
  const [result, setResult] = useState<TestResult | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => runTests(), 500)
    return () => clearTimeout(timer)
  }, [])

  const runTests = async () => {
    let passed = 0, failed = 0
    const messages: string[] = []
    let testId: string | null = null

    try {
      // 测试1: 创建笔记
      try {
        testId = addNote()
        await new Promise(r => setTimeout(r, 600))
        if (testId) { passed++; messages.push('创建笔记: OK') }
        else { failed++; messages.push('创建笔记: FAIL') }
      } catch (e) { failed++; messages.push('创建笔记: FAIL ' + e) }

      // 测试2: 文件存储
      try {
        await reloadNotes()
        await new Promise(r => setTimeout(r, 100))
        const loaded = await window.notesAPI.loadNotes()
        if (testId && loaded.some(n => n.id === testId)) { passed++; messages.push('文件存储: OK') }
        else { failed++; messages.push('文件存储: FAIL') }
      } catch (e) { failed++; messages.push('文件存储: FAIL ' + e) }

      // 测试3: XSS防护
      try {
        const esc = escapeHtml('<script>alert(1)</script>')
        if (!esc.includes('<script>')) { passed++; messages.push('XSS防护: OK') }
        else { failed++; messages.push('XSS防护: FAIL') }
      } catch (e) { failed++; messages.push('XSS防护: FAIL') }

      // 测试4: ID生成唯一性
      try {
        if (uid() !== uid()) { passed++; messages.push('ID生成: OK') }
        else { failed++; messages.push('ID生成: FAIL') }
      } catch (e) { failed++; messages.push('ID生成: FAIL') }

      // 测试5: 时间格式化
      try {
        const fs = formatTime(Date.now())
        if (typeof fs === 'string' && fs.length > 0) { passed++; messages.push('时间格式化: OK') }
        else { failed++; messages.push('时间格式化: FAIL') }
      } catch (e) { failed++; messages.push('时间格式化: FAIL') }

      // 测试6: 选择笔记
      try {
        if (testId) {
          selectNote(testId)
          const found = (await window.notesAPI.loadNotes()).find(n => n.id === testId)
          if (found) { passed++; messages.push('选择笔记: OK') }
          else { failed++; messages.push('选择笔记: FAIL') }
        }
      } catch (e) { failed++; messages.push('选择笔记: FAIL') }

      // 测试7: 删除笔记
      try {
        if (testId) {
          const beforeDel = (await window.notesAPI.loadNotes()).length
          deleteNote(testId)
          await new Promise(r => setTimeout(r, 600))
          await reloadNotes()
          const afterDel = (await window.notesAPI.loadNotes()).length
          if (afterDel === beforeDel - 1) { passed++; messages.push('删除笔记: OK') }
          else { failed++; messages.push('删除笔记: FAIL') }
        }
      } catch (e) { failed++; messages.push('删除笔记: FAIL ' + e) }

      selectNote(null)
      setResult({ passed, failed, messages })
      setTimeout(() => setResult(null), 8000)
    } catch (e) {
      failed++
      messages.push('测试执行异常: ' + String(e))
      setResult({ passed, failed, messages })
    }
  }

  if (!result) return null

  const color = result.failed > 0 ? '#f44336' : '#4caf50'
  return (
    <div className="test-panel" data-testid="test-panel">
      <b>测试结果: <span style={{ color }}>{result.passed} 通过, {result.failed} 失败</span></b>
      <br />
      {result.messages.map((m, i) => <div key={i}>{m}</div>)}
      {result.failed === 0 && <div style={{ color: '#4caf50' }}>所有测试通过!</div>}
    </div>
  )
}
