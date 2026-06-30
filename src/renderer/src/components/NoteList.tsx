interface NoteListProps {
  children: React.ReactNode
}

export default function NoteList({ children }: NoteListProps) {
  return <div className="list" data-testid="note-list">{children}</div>
}
