import { useState, useEffect, useMemo } from 'react'
import { Category } from '../types'
import '../styles/CategoryTreeSelect.css'

interface CategoryTreeSelectProps {
  categories: Category[]
  selectedIds?: number[]
  onSelect?: (categoryId: number) => void
  mode?: 'single' | 'multiple'
  excludeId?: number
}

export function CategoryTreeSelect({
  categories,
  selectedIds = [],
  onSelect,
  mode = 'single',
  excludeId,
}: CategoryTreeSelectProps) {
  const { childrenByParent, parentById } = useMemo(() => {
    const children = new Map<number | null, Category[]>()
    const parents = new Map<number, number | null>()

    for (const category of categories) {
      if (category.id === excludeId) continue
      parents.set(category.id, category.parentId)
      const siblings = children.get(category.parentId) ?? []
      siblings.push(category)
      children.set(category.parentId, siblings)
    }

    for (const siblings of children.values()) {
      siblings.sort((a, b) => a.name.localeCompare(b.name))
    }

    return { childrenByParent: children, parentById: parents }
  }, [categories, excludeId])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const getAncestorIds = (categoryId: number): number[] => {
    const ancestors: number[] = []
    let currentParent = parentById.get(categoryId) ?? null

    while (currentParent !== null) {
      ancestors.push(currentParent)
      currentParent = parentById.get(currentParent) ?? null
    }

    return ancestors
  }

  const initialExpandedIds = useMemo(() => {
    const allAncestors = new Set<number>()
    for (const selectedId of selectedIds) {
      const ancestors = getAncestorIds(selectedId)
      ancestors.forEach((id) => allAncestors.add(id))
    }
    return allAncestors
  }, [selectedIds, parentById])

  const [expandedIds, setExpandedIds] = useState<Set<number>>(initialExpandedIds)

  // Update expanded IDs when selected items change
  useEffect(() => {
    setExpandedIds(prev => {
      const newExpanded = new Set(prev)
      for (const selectedId of selectedIds) {
        const ancestors = getAncestorIds(selectedId)
        ancestors.forEach(id => newExpanded.add(id))
      }
      return newExpanded
    })
  }, [selectedIds, parentById])

  const toggleExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedIds(newExpanded)
  }

  const selectedAncestorIds = useMemo(() => {
    if (mode !== 'multiple') return new Set<number>()

    const ancestors = new Set<number>()
    for (const selectedId of selectedIds) {
      let currentParent = parentById.get(selectedId) ?? null
      while (currentParent !== null) {
        ancestors.add(currentParent)
        currentParent = parentById.get(currentParent) ?? null
      }
    }

    return ancestors
  }, [mode, parentById, selectedIds])

  // Check if category should appear checked (directly selected or has selected descendants)
  const isChecked = (categoryId: number): boolean => {
    return selectedSet.has(categoryId) || (mode === 'multiple' && selectedAncestorIds.has(categoryId))
  }

  // Check if category is directly selected (not just ancestor of selected)
  const isDirectlySelected = (categoryId: number): boolean => {
    return selectedSet.has(categoryId)
  }

  const renderTree = (parentId: number | null = null, level: number = 0) => {
    const items = childrenByParent.get(parentId) ?? []

    if (items.length === 0) return null

    return (
      <ul className="tree-select-list">
        {items.map(category => {
          const isExpanded = expandedIds.has(category.id)
          const checked = isChecked(category.id)
          const directlySelected = isDirectlySelected(category.id)
          const hasChildNodes = (childrenByParent.get(category.id) ?? []).length > 0

          return (
            <li key={category.id} className="tree-select-item">
              <div className="tree-select-row" style={{ paddingLeft: `${level * 1.5}rem` }}>
                {hasChildNodes ? (
                  <button
                    type="button"
                    className="tree-toggle"
                    onClick={() => toggleExpand(category.id)}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                ) : (
                  <span className="tree-spacer" />
                )}
                <label className={`tree-label ${checked && !directlySelected ? 'implicit' : ''}`}>
                  {mode === 'multiple' ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onSelect?.(category.id)}
                    />
                  ) : (
                    <input
                      type="radio"
                      name="category"
                      checked={checked}
                      onChange={() => onSelect?.(category.id)}
                    />
                  )}
                  <span className="tree-label-text">
                    {category.name}
                    {checked && !directlySelected && mode === 'multiple' && (
                      <span className="implicit-badge">via child</span>
                    )}
                  </span>
                </label>
              </div>
              {isExpanded && hasChildNodes && renderTree(category.id, level + 1)}
            </li>
          )
        })}
      </ul>
    )
  }

  return <div className="tree-select">{renderTree()}</div>
}
