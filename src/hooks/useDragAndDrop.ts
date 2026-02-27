import { useState, useCallback } from 'react'
import { Category } from '../types'
import { useToast } from '../components/Toast'

interface UseDragAndDropResult {
  draggedId: number | null
  dragOverId: number | null
  dragOverAsChild: boolean
  handleDragStart: (e: React.DragEvent, categoryId: number) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, targetId: number | null, asChild?: boolean) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent, targetId: number | null, makeChild?: boolean, categories?: Category[], onMove?: (categoryId: number, newParentId: number | null) => void) => void
}

export function useDragAndDrop(): UseDragAndDropResult {
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [dragOverAsChild, setDragOverAsChild] = useState(false)
  const { showToast } = useToast()

  const handleDragStart = useCallback((e: React.DragEvent, categoryId: number) => {
    e.stopPropagation()
    setDraggedId(categoryId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', categoryId.toString())
    const dragImage = e.currentTarget as HTMLElement
    e.dataTransfer.setDragImage(dragImage, 100, 25)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverId(null)
    setDragOverAsChild(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: number | null, asChild: boolean = false) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
    setDragOverAsChild(asChild)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverId(null)
      setDragOverAsChild(false)
    }
  }, [])

  const isDescendant = useCallback((parentId: number, childId: number, categories: Category[]): boolean => {
    const children = categories.filter(c => c.parentId === parentId)
    if (children.some(c => c.id === childId)) return true
    return children.some(c => isDescendant(c.id, childId, categories))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: number | null, makeChild: boolean = false, categories?: Category[], onMove?: (categoryId: number, newParentId: number | null) => void) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    setDragOverAsChild(false)

    if (draggedId === null || !categories || !onMove) return
    if (draggedId === targetId) {
      setDraggedId(null)
      return
    }

    if (targetId !== null && makeChild && isDescendant(draggedId, targetId, categories)) {
      showToast('Cannot move a category into its own descendant', 'error')
      setDraggedId(null)
      return
    }

    if (targetId !== null && !makeChild && isDescendant(draggedId, targetId, categories)) {
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

    onMove(draggedId, newParentId)
    setDraggedId(null)
  }, [draggedId, isDescendant, showToast])

  return {
    draggedId,
    dragOverId,
    dragOverAsChild,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
