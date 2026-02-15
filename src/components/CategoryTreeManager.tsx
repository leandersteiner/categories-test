import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Category } from '../types'
import { api } from '../api'
import { useToast } from './Toast'
import '../styles/CategoryTreeManager.css'

interface CategoryTreeManagerProps {
  categories: Category[]
}

export function CategoryTreeManager({ categories }: CategoryTreeManagerProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [creatingAtId, setCreatingAtId] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [dragOverAsChild, setDragOverAsChild] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingName, setEditingName] = useState('')

  const createMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: number | null }) => 
      api.createCategory({ name, parentId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (variables.parentId !== null) {
        setExpandedIds(prev => new Set([...prev, variables.parentId!]))
      }
      setCreatingAtId(null)
      setNewCategoryName('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: api.updateCategory,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (variables.parentId !== null) {
        setExpandedIds(prev => new Set([...prev, variables.parentId!]))
      }
      setEditingCategory(null)
    },
  })

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category)
    setEditingName(category.name)
  }

  const handleSaveEdit = () => {
    if (!editingCategory || !editingName.trim()) return
    updateMutation.mutate({
      ...editingCategory,
      name: editingName.trim(),
    })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditingName('')
  }

  const deleteMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: true })
      setDeletingCategory(null)
    },
    onError: (error: Error) => {
      showToast(error.message, 'error')
    },
  })

  const buildTree = (parentId: number | null = null): Category[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const toggleExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedIds(newExpanded)
  }

  const expandAll = () => {
    const allIds = categories.map(c => c.id)
    setExpandedIds(new Set(allIds))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const hasChildren = (categoryId: number) => {
    return categories.some(cat => cat.parentId === categoryId)
  }

  const handleCreateCategory = (parentId: number | null) => {
    if (!newCategoryName.trim()) return

    createMutation.mutate({
      name: newCategoryName.trim(),
      parentId,
    })
  }

  const handleDragStart = (e: React.DragEvent, categoryId: number) => {
    e.stopPropagation()
    setDraggedId(categoryId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', categoryId.toString())
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    setDragOverAsChild(false)
  }

  const handleDragOver = (e: React.DragEvent, targetId: number | null, asChild: boolean = false) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
    setDragOverAsChild(asChild)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverId(null)
      setDragOverAsChild(false)
    }
  }

  const handleToggleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleToggleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent, targetId: number | null, makeChild: boolean = false) => {
    e.preventDefault()
    e.stopPropagation()

    setDragOverId(null)
    setDragOverAsChild(false)

    if (draggedId === null) {
      return
    }

    if (draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const isDescendant = (parentId: number, childId: number): boolean => {
      const children = categories.filter(c => c.parentId === parentId)
      if (children.some(c => c.id === childId)) return true
      return children.some(c => isDescendant(c.id, childId))
    }

    if (targetId !== null && makeChild && isDescendant(draggedId, targetId)) {
      showToast('Cannot move a category into its own descendant', 'error')
      setDraggedId(null)
      return
    }

    if (targetId !== null && !makeChild && isDescendant(draggedId, targetId)) {
      showToast('Cannot move a parent category next to its descendant', 'error')
      setDraggedId(null)
      return
    }

    const category = categories.find(c => c.id === draggedId)
    if (!category) {
      setDraggedId(null)
      return
    }

    let newParentId: number | null

    if (makeChild) {
      newParentId = targetId
    } else if (targetId !== null) {
      const targetCategory = categories.find(c => c.id === targetId)
      newParentId = targetCategory?.parentId ?? null
    } else {
      newParentId = null
    }

    if (category.parentId === newParentId) {
      setDraggedId(null)
      return
    }

    updateMutation.mutate({
      ...category,
      parentId: newParentId,
    })

    setDraggedId(null)
  }

  const renderTree = (parentId: number | null = null, level: number = 0) => {
    const items = buildTree(parentId)

    return (
      <ul className="category-tree-list">
        {items.map(category => {
          const isExpanded = expandedIds.has(category.id)
          const hasChildNodes = hasChildren(category.id)
          const isDragging = draggedId === category.id

          return (
            <li key={category.id} className={`category-tree-item depth-${level} ${isDragging ? 'dragging' : ''}`}>
              <div
                className={`category-tree-row ${dragOverId === category.id && !dragOverAsChild ? 'drag-over-sibling' : ''} ${hasChildNodes ? 'has-children' : ''}`}
                onDragOver={(e) => handleDragOver(e, category.id, false)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category.id, false)}
                onClick={() => {
                  if (hasChildNodes) {
                    toggleExpand(category.id)
                  }
                }}
              >
                <button
                  type="button"
                  className="tree-toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    hasChildNodes && toggleExpand(category.id)
                  }}
                  onDragOver={handleToggleDragOver}
                  onDrop={handleToggleDrop}
                  disabled={!hasChildNodes}
                >
                  {hasChildNodes ? (isExpanded ? '▼' : '▶') : '•'}
                </button>

                <span
                  className="drag-handle"
                  title="Drag to reorder"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, category.id)}
                  onDragEnd={handleDragEnd}
                >
                  ⋮⋮
                </span>

                <span
                  className={`category-name ${dragOverId === category.id && dragOverAsChild ? 'drag-over-child' : ''}`}
                  onDragOver={(e) => handleDragOver(e, category.id, true)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, category.id, true)}
                  onDoubleClick={() => handleStartEdit(category)}
                >
                  {editingCategory?.id === category.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        else if (e.key === 'Escape') handleCancelEdit()
                      }}
                      onBlur={handleSaveEdit}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    category.name
                  )}
                </span>

                <div className="category-actions">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => setCreatingAtId(category.id)}
                    title="Add child category"
                  >
                    + Add Child
                  </button>
                  <button
                    type="button"
                    className="action-btn delete-btn"
                    onClick={() => setDeletingCategory(category)}
                    title="Delete category"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {creatingAtId === category.id && (
                <div className="category-create-inline">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCategory(category.id)
                      } else if (e.key === 'Escape') {
                        setCreatingAtId(null)
                        setNewCategoryName('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-save"
                    onClick={() => handleCreateCategory(category.id)}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setCreatingAtId(null)
                      setNewCategoryName('')
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {isExpanded && hasChildNodes && renderTree(category.id, level + 1)}
            </li>
          )
        })}

        {parentId === null && creatingAtId === -1 && (
          <li className="category-tree-item depth-0">
            <div className="category-create-inline">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New top-level category"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory(null)
                  } else if (e.key === 'Escape') {
                    setCreatingAtId(null)
                    setNewCategoryName('')
                  }
                }}
              />
              <button
                type="button"
                className="btn-save"
                onClick={() => handleCreateCategory(null)}
              >
                ✓
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setCreatingAtId(null)
                  setNewCategoryName('')
                }}
              >
                ✕
              </button>
            </div>
          </li>
        )}
      </ul>
    )
  }

  return (
    <div className="category-tree-manager">
      <div className="tree-header">
        <button
          type="button"
          className="btn-add-root"
          onClick={() => setCreatingAtId(-1)}
        >
          + Add Top-Level Category
        </button>
        <div className="tree-header-actions">
          <button type="button" className="btn-toggle-all" onClick={expandAll}>Expand All</button>
          <button type="button" className="btn-toggle-all" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      <div
        className={`tree-drop-zone ${dragOverId === null && draggedId !== null ? 'drag-over-root' : ''}`}
        onDragOver={(e) => handleDragOver(e, null, false)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null, false)}
      >
        {renderTree()}
      </div>

      <div className="tree-help">
        <p>💡 Drag and drop categories to reorganize. Click "+ Add Child" to create nested categories.</p>
      </div>

      {deletingCategory && (
        <div className="modal-overlay" onClick={() => setDeletingCategory(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Category</h3>
            <p>Are you sure you want to delete "{deletingCategory.name}"?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={() => setDeletingCategory(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-delete"
                onClick={() => {
                  deleteMutation.mutate(deletingCategory.id)
                  setDeletingCategory(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
