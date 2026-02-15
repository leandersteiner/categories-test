import { useState, useMemo, useEffect } from 'react'
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingName, setEditingName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { filteredCategories, matchingIds, exactMatchIds } = useMemo(() => {
    if (!searchQuery) {
      return { filteredCategories: categories, matchingIds: new Set<number>(), exactMatchIds: new Set<number>() }
    }
    
    const matching = new Set<number>()
    const exactMatches = new Set<number>()
    const allMatches = categories.filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    allMatches.forEach(cat => {
      exactMatches.add(cat.id)
      let current: Category | undefined = cat
      while (current) {
        matching.add(current.id)
        current = categories.find(c => c.id === current?.parentId)
      }
    })
    
    return {
      filteredCategories: categories.filter(cat => matching.has(cat.id)),
      matchingIds: matching,
      exactMatchIds: exactMatches
    }
  }, [categories, searchQuery])

  useEffect(() => {
    if (searchQuery && matchingIds.size > 0) {
      const allParentIds = new Set<number>()
      categories.forEach(cat => {
        if (matchingIds.has(cat.id)) {
          let current = cat
          while (current.parentId) {
            allParentIds.add(current.parentId)
            current = categories.find(c => c.id === current.parentId) || current
          }
        }
      })
      setExpandedIds(prev => new Set([...prev, ...allParentIds]))
    }
  }, [searchQuery, matchingIds, categories])

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
      setEditingName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: true })
    },
    onError: (error: Error) => {
      showToast(error.message, 'error')
    },
  })

  const buildTree = (parentId: number | null = null): Category[] => {
    return filteredCategories
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const toggleExpand = (categoryId: number) => {
    setExpandedIds(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId)
      } else {
        newExpanded.add(categoryId)
      }
      return newExpanded
    })
  }

  const expandAll = () => {
    const allIds = categories.map(c => c.id)
    setExpandedIds(new Set(allIds))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const hasChildren = (categoryId: number) => {
    return filteredCategories.some(cat => cat.parentId === categoryId)
  }

  const handleCreateCategory = (parentId: number | null) => {
    if (!newCategoryName.trim()) return
    createMutation.mutate({
      name: newCategoryName.trim(),
      parentId,
    })
  }

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

  const handleDragStart = (e: React.DragEvent, categoryId: number) => {
    e.stopPropagation()
    setDraggedId(categoryId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', categoryId.toString())
    const dragImage = e.currentTarget as HTMLElement
    e.dataTransfer.setDragImage(dragImage, 100, 25)
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

  const handleDrop = (e: React.DragEvent, targetId: number | null, makeChild: boolean = false) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    setDragOverAsChild(false)

    if (draggedId === null) return
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

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const renderTree = (matchingIds: Set<number>, exactMatchIds: Set<number>, parentId: number | null = null, level: number = 0) => {
    const items = buildTree(parentId)
    return (
      <div className="category-items-list">
        {items.map(category => {
          const isExpanded = expandedIds.has(category.id)
          const hasChildNodes = hasChildren(category.id)
          const isDragging = draggedId === category.id

          return (
            <div 
              key={category.id} 
              className={`category-item-wrapper depth-${level} ${isDragging ? 'dragging' : ''} ${hasChildNodes ? 'has-children' : ''} ${exactMatchIds.has(category.id) && exactMatchIds.size > 0 ? 'matching' : ''}`}
            >
              <div
                className={`category-card depth-${level} ${dragOverId === category.id && !dragOverAsChild ? 'drag-over-sibling' : ''} ${exactMatchIds.has(category.id) && exactMatchIds.size > 0 ? 'matching' : ''}`}
                draggable={!isMutating}
                onDragStart={(e) => handleDragStart(e, category.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, category.id, false)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category.id, false)}
                onClick={() => hasChildNodes && toggleExpand(category.id)}
              >
                <div className={`category-card-main ${hasChildNodes ? 'has-children' : ''}`}>
                  {hasChildNodes && (
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  )}
                  {!hasChildNodes && <span className="expand-placeholder" />}
                  <span
                    className="drag-handle"
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <div className="category-info">
                    <div className="category-header-row">
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
                          <h3>{category.name}</h3>
                        )}
                      </span>
                      {hasChildNodes && (
                        <span className="category-count">{filteredCategories.filter(c => c.parentId === category.id).length} children</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="category-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setCreatingAtId(category.id)}
                    title="Add child category"
                    disabled={isMutating}
                  >
                    + Add Child
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => deleteMutation.mutate(category.id)}
                    title="Delete category"
                    disabled={isMutating}
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
                      if (e.key === 'Enter') handleCreateCategory(category.id)
                      else if (e.key === 'Escape') { setCreatingAtId(null); setNewCategoryName('') }
                    }}
                  />
                  <button type="button" className="btn-save" onClick={() => handleCreateCategory(category.id)}>✓</button>
                  <button type="button" className="btn-cancel" onClick={() => { setCreatingAtId(null); setNewCategoryName('') }}>✕</button>
                </div>
              )}

              {isExpanded && hasChildNodes && (
                <div className="category-children">
                  {renderTree(matchingIds, exactMatchIds, category.id, level + 1)}
                </div>
              )}
            </div>
          )
        })}
        {parentId === null && creatingAtId === -1 && (
          <div className="category-item-wrapper depth-0">
            <div className="category-create-inline">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New top-level category"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCategory(null)
                  else if (e.key === 'Escape') { setCreatingAtId(null); setNewCategoryName('') }
                }}
              />
              <button type="button" className="btn-save" onClick={() => handleCreateCategory(null)}>✓</button>
              <button type="button" className="btn-cancel" onClick={() => { setCreatingAtId(null); setNewCategoryName('') }}>✕</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Categories</h2>
        <button type="button" className="btn-add-root" onClick={() => setCreatingAtId(-1)} disabled={isMutating}>
          + Add Top-Level Category
        </button>
      </div>
      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="category-tree-manager">
        <div className="tree-header">
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
          {renderTree(matchingIds, exactMatchIds)}
        </div>
        <div className="tree-help">
          <p>💡 Drag and drop categories to reorganize. Click "+ Add Child" to create nested categories.</p>
        </div>
      </div>
    </div>
  )
}
