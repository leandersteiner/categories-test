import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Category } from '../types'
import { api } from '../api'
import { useToast } from './Toast'
import { useCategoryTree } from '../hooks/useCategoryTree'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import { CategoryTree } from './CategoryTree'
import '../styles/CategoryTreeManager.css'

interface CategoryTreeManagerProps {
  categories: Category[]
}

export function CategoryTreeManager({ categories }: CategoryTreeManagerProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [creatingAtId, setCreatingAtId] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingName, setEditingName] = useState('')

  const {
    filteredCategories,
    exactMatchIds,
    searchQuery,
    setSearchQuery,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
  } = useCategoryTree(categories)

  const {
    draggedId,
    dragOverId,
    dragOverAsChild,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useDragAndDrop()

  const createMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: number | null }) =>
      api.createCategory({ name, parentId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (variables.parentId !== null) {
        expandAll(categories.map(c => c.id))
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
        expandAll(categories.map(c => c.id))
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

  const handleMoveCategory = (categoryId: number, newParentId: number | null) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    updateMutation.mutate({
      ...category,
      parentId: newParentId,
    })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

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
            <button type="button" className="btn-toggle-all" onClick={() => expandAll(categories.map(c => c.id))}>Expand All</button>
            <button type="button" className="btn-toggle-all" onClick={collapseAll}>Collapse All</button>
          </div>
        </div>
        <div
          className={`tree-drop-zone ${dragOverId === null && draggedId !== null ? 'drag-over-root' : ''}`}
          onDragOver={(e) => handleDragOver(e, null, false)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null, false, categories, handleMoveCategory)}
        >
          <CategoryTree
            categories={filteredCategories}
            exactMatchIds={exactMatchIds}
            expandedIds={expandedIds}
            draggedId={draggedId}
            dragOverId={dragOverId}
            dragOverAsChild={dragOverAsChild}
            isMutating={isMutating}
            editingCategory={editingCategory}
            editingName={editingName}
            creatingAtId={creatingAtId}
            newCategoryName={newCategoryName}
            onToggleExpand={toggleExpand}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e, targetId, makeChild) => handleDrop(e, targetId, makeChild, categories, handleMoveCategory)}
            onStartEdit={handleStartEdit}
            onEditNameChange={setEditingName}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onStartCreate={setCreatingAtId}
            onCreateNameChange={setNewCategoryName}
            onCreate={handleCreateCategory}
            onCancelCreate={() => { setCreatingAtId(null); setNewCategoryName('') }}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </div>
        <div className="tree-help">
          <p>💡 Drag and drop categories to reorganize. Click "+ Add Child" to create nested categories.</p>
        </div>
      </div>
    </div>
  )
}
