import { ReactNode } from 'react'
import { Category } from '../types'
import { CategoryCreateInline } from './CategoryCreateInline'

interface CategoryCardProps {
  category: Category
  level: number
  isExpanded: boolean
  hasChildren: boolean
  renderChildren?: () => ReactNode
  isDragging: boolean
  dragOverId: number | null
  dragOverAsChild: boolean
  exactMatch: boolean
  childCount: number
  isMutating: boolean
  isEditing: boolean
  editingName: string
  isCreating: boolean
  newCategoryName: string
  onToggleExpand: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, asChild: boolean) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, makeChild: boolean) => void
  onStartEdit: () => void
  onEditNameChange: (name: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartCreate: () => void
  onCreateNameChange: (name: string) => void
  onCreate: () => void
  onCancelCreate: () => void
  onDelete: () => void
}

export function CategoryCard({
  category,
  level,
  isExpanded,
  hasChildren,
  renderChildren,
  isDragging,
  dragOverId,
  dragOverAsChild,
  exactMatch,
  childCount,
  isMutating,
  isEditing,
  editingName,
  isCreating,
  newCategoryName,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onStartCreate,
  onCreateNameChange,
  onCreate,
  onCancelCreate,
  onDelete,
}: CategoryCardProps) {
  const isDragOverSibling = dragOverId === category.id && !dragOverAsChild
  const isDragOverChild = dragOverId === category.id && dragOverAsChild

  return (
    <div 
      className={`category-item-wrapper depth-${level} ${isDragging ? 'dragging' : ''} ${hasChildren ? 'has-children' : ''} ${exactMatch ? 'matching' : ''}`}
    >
      <div
        className={`category-card depth-${level} ${isDragOverSibling ? 'drag-over-sibling' : ''} ${exactMatch ? 'matching' : ''}`}
        draggable={!isMutating}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, false)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, false)}
        onClick={() => hasChildren && onToggleExpand()}
      >
        <div className={`category-card-main ${hasChildren ? 'has-children' : ''}`}>
          {hasChildren && (
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          )}
          {!hasChildren && <span className="expand-placeholder" />}
          <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
          <div className="category-info">
            <div className="category-header-row">
              <span
                className={`category-name ${isDragOverChild ? 'drag-over-child' : ''}`}
                onDragOver={(e) => onDragOver(e, true)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, true)}
                onDoubleClick={onStartEdit}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit()
                      else if (e.key === 'Escape') onCancelEdit()
                    }}
                    onBlur={onSaveEdit}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3>{category.name}</h3>
                )}
              </span>
              {hasChildren && (
                <span className="category-count">{childCount} children</span>
              )}
            </div>
          </div>
        </div>
        <div className="category-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onStartCreate}
            title="Add child category"
            disabled={isMutating}
          >
            + Add Child
          </button>
          <button
            type="button"
            className="btn-danger btn-sm"
            onClick={onDelete}
            title="Delete category"
            disabled={isMutating}
          >
            Delete
          </button>
        </div>
      </div>

      {isCreating && (
        <CategoryCreateInline
          value={newCategoryName}
          onChange={onCreateNameChange}
          onSave={onCreate}
          onCancel={onCancelCreate}
          placeholder="New category name"
        />
      )}

      {isExpanded && hasChildren && renderChildren && (
        <div className="category-children">
          {renderChildren()}
        </div>
      )}
    </div>
  )
}
