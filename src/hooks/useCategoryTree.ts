import { useState, useMemo, useEffect } from 'react'
import { Category } from '../types'

interface UseCategoryTreeResult {
  filteredCategories: Category[]
  matchingIds: Set<number>
  exactMatchIds: Set<number>
  searchQuery: string
  setSearchQuery: (query: string) => void
  expandedIds: Set<number>
  toggleExpand: (categoryId: number) => void
  expandAll: (allIds: number[]) => void
  collapseAll: () => void
}

export function useCategoryTree(categories: Category[]): UseCategoryTreeResult {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

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

  const expandAll = (allIds: number[]) => {
    setExpandedIds(new Set(allIds))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  return {
    filteredCategories,
    matchingIds,
    exactMatchIds,
    searchQuery,
    setSearchQuery,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
  }
}
