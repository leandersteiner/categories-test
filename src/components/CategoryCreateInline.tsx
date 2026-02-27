interface CategoryCreateInlineProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  placeholder: string
}

export function CategoryCreateInline({ value, onChange, onSave, onCancel, placeholder }: CategoryCreateInlineProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSave()
    else if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="category-create-inline">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={handleKeyDown}
      />
      <button type="button" className="btn-save" onClick={onSave}>✓</button>
      <button type="button" className="btn-cancel" onClick={onCancel}>✕</button>
    </div>
  )
}
