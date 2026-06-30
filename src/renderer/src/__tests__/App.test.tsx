import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<App />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders welcome screen after loading', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('welcome')).toBeInTheDocument()
    })
    expect(screen.getByText('选择一条笔记或点击新建开始记录')).toBeInTheDocument()
  })

  it('creates a new note when clicking add button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('welcome')).toBeInTheDocument())
    await user.click(screen.getByText('+ 新建'))
    expect(screen.getByTestId('title-input')).toBeInTheDocument()
    expect(screen.getByTestId('content-input')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-preview')).toBeInTheDocument()
  })
})
