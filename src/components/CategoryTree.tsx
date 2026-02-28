import { useMemo } from 'react'
import { Category } from '../types'
import { CategoryCard } from './CategoryCard'
import { CategoryCreateInline } from './CategoryCreateInline'

interface CategoryTreeProps {
  categories: Category[]
  exactMatchIds: Set<number>
  expandedIds: Set<number>
  draggedId: number | null
  dragOverId: number | null
  dragOverAsChild: boolean
  isMutating: boolean
  editingCategory: Category | null
  editingName: string
  creatingAtId: number | null
  newCategoryName: string
  parentId?: number | null
  level?: number
  childrenByParent?: Map<number | null, Category[]>
  onToggleExpand: (categoryId: number) => void
  onDragStart: (e: React.DragEvent, categoryId: number) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, targetId: number | null, asChild: boolean) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: number | null, makeChild: boolean) => void
  onStartEdit: (category: Category) => void
  onEditNameChange: (name: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartCreate: (parentId: number) => void
  onCreateNameChange: (name: string) => void
  onCreate: (parentId: number | null) => void
  onCancelCreate: () => void
  onDelete: (categoryId: number) => void
}

export function CategoryTree({
  categories,
  exactMatchIds,
  expandedIds,
  draggedId,
  dragOverId,
  dragOverAsChild,
  isMutating,
  editingCategory,
  editingName,
  creatingAtId,
  newCategoryName,
  parentId = null,
  level = 0,
  childrenByParent: providedChildrenByParent,
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
}: CategoryTreeProps) {
  const childrenByParent = useMemo(() => {
    if (providedChildrenByParent) {
      return providedChildrenByParent
    }

    const byParent = new Map<number | null, Category[]>()
    for (const category of categories) {
      const siblings = byParent.get(category.parentId) ?? []
      siblings.push(category)
      byParent.set(category.parentId, siblings)
    }

    for (const siblings of byParent.values()) {
      siblings.sort((a, b) => a.name.localeCompare(b.name))
    }

    return byParent
  }, [categories, providedChildrenByParent])

  const getChildren = (pid: number | null): Category[] => childrenByParent.get(pid) ?? []

  const renderChildren = (categoryId: number, childLevel: number) => () => (
    <CategoryTree
      categories={categories}
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
      parentId={categoryId}
      level={childLevel}
      childrenByParent={childrenByParent}
      onToggleExpand={onToggleExpand}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onStartEdit={onStartEdit}
      onEditNameChange={onEditNameChange}
      onSaveEdit={onSaveEdit}
      onCancelEdit={onCancelEdit}
      onStartCreate={onStartCreate}
      onCreateNameChange={onCreateNameChange}
      onCreate={onCreate}
      onCancelCreate={onCancelCreate}
      onDelete={onDelete}
    />
  )

  const items = getChildren(parentId)

  return (
    <div className="category-items-list">
      {items.map(category => {
        const isExpanded = expandedIds.has(category.id)
        const childNodes = getChildren(category.id)
        const hasChildNodes = childNodes.length > 0
        const isDragging = draggedId === category.id

        return (
          <CategoryCard
            key={category.id}
            category={category}
            level={level}
            isExpanded={isExpanded}
            hasChildren={hasChildNodes}
            renderChildren={hasChildNodes ? renderChildren(category.id, level + 1) : undefined}
            isDragging={isDragging}
            dragOverId={dragOverId}
            dragOverAsChild={dragOverAsChild}
            exactMatch={exactMatchIds.has(category.id) && exactMatchIds.size > 0}
            childCount={childNodes.length}
            isMutating={isMutating}
            isEditing={editingCategory?.id === category.id}
            editingName={editingName}
            isCreating={creatingAtId === category.id}
            newCategoryName={newCategoryName}
            onToggleExpand={() => onToggleExpand(category.id)}
            onDragStart={(e) => onDragStart(e, category.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e, asChild) => onDragOver(e, category.id, asChild)}
            onDragLeave={onDragLeave}
            onDrop={(e, makeChild) => onDrop(e, category.id, makeChild)}
            onStartEdit={() => onStartEdit(category)}
            onEditNameChange={onEditNameChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onStartCreate={() => onStartCreate(category.id)}
            onCreateNameChange={onCreateNameChange}
            onCreate={() => onCreate(category.id)}
            onCancelCreate={onCancelCreate}
            onDelete={() => onDelete(category.id)}
          />
        )
      })}
      {parentId === null && creatingAtId === -1 && (
        <div className="category-item-wrapper depth-0">
          <CategoryCreateInline
            value={newCategoryName}
            onChange={onCreateNameChange}
            onSave={() => onCreate(null)}
            onCancel={onCancelCreate}
            placeholder="New top-level category"
          />
        </div>
      )}
    </div>
  )
}
