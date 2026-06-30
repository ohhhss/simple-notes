import NoteList from './NoteList'

interface SidebarProps {
  searchKeyword: string
  onSearchChange: (v: string) => void
  onAddNote: () => void
  children: React.ReactNode
}

export default function Sidebar({ searchKeyword, onSearchChange, onAddNote, children }: SidebarProps) {
  return (
    <div className="left">
      <div className="left-head">
        <div className="logo-area">
          <img src="/logo.svg" alt="简单笔记" className="app-logo" />
          <h2>简单笔记</h2>
        </div>
        <button className="add-btn" onClick={onAddNote} title="新建笔记 (Ctrl+N)">+ 新建</button>
      </div>
      <div className="search">
        <input
          type="text"
          placeholder="搜索笔记..."
          value={searchKeyword}
          onChange={e => onSearchChange(e.target.value)}
          data-testid="search-input"
        />
      </div>
      <NoteList>{children}</NoteList>
    </div>
  )
}
