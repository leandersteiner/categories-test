import { useState, useEffect } from 'react'
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
  // Get all ancestor IDs for selected items
  const getAncestorIds = (categoryId: number): number[] => {
    const ancestors: number[] = []
    const category = categories.find(c => c.id === categoryId)

    if (category?.parentId) {
      ancestors.push(category.parentId)
      ancestors.push(...getAncestorIds(category.parentId))
    }

    return ancestors
  }

  // Initialize expanded IDs with ancestors of all selected items
  const getInitialExpandedIds = (): Set<number> => {
    const allAncestors = new Set<number>()

    for (const selectedId of selectedIds) {
      const ancestors = getAncestorIds(selectedId)
      ancestors.forEach(id => allAncestors.add(id))
    }

    return allAncestors
  }

  const [expandedIds, setExpandedIds] = useState<Set<number>>(getInitialExpandedIds())

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
  }, [selectedIds, categories])

  const buildTree = (parentId: number | null = null): Category[] => {
    return categories
      .filter(cat => cat.parentId === parentId && cat.id !== excludeId)
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

  const hasChildren = (categoryId: number) => {
    return categories.some(cat => cat.parentId === categoryId && cat.id !== excludeId)
  }

  // Get all descendant IDs for a given category
  const getDescendantIds = (categoryId: number): number[] => {
    const descendants: number[] = []
    const children = categories.filter(c => c.parentId === categoryId && c.id !== excludeId)

    for (const child of children) {
      descendants.push(child.id)
      descendants.push(...getDescendantIds(child.id))
    }

    return descendants
  }

  // Check if category should appear checked (directly selected or has selected descendants)
  const isChecked = (categoryId: number): boolean => {
    if (selectedIds.includes(categoryId)) return true

    // In multiple mode, also check if any descendant is selected
    if (mode === 'multiple') {
      const descendants = getDescendantIds(categoryId)
      return descendants.some(descId => selectedIds.includes(descId))
    }

    return false
  }

  // Check if category is directly selected (not just ancestor of selected)
  const isDirectlySelected = (categoryId: number): boolean => {
    return selectedIds.includes(categoryId)
  }

  const renderTree = (parentId: number | null = null, level: number = 0) => {
    const items = buildTree(parentId)

    if (items.length === 0) return null

    return (
      <ul className="tree-select-list">
        {items.map(category => {
          const isExpanded = expandedIds.has(category.id)
          const checked = isChecked(category.id)
          const directlySelected = isDirectlySelected(category.id)
          const hasChildNodes = hasChildren(category.id)

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
