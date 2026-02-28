import { TreeNode } from '../types'

interface TreeItem {
  id: number
  name: string
  parentId: number | null
}

export function buildTree<T extends TreeItem>(items: T[]): TreeNode<T>[] {
  const childrenByParent = new Map<number | null, T[]>()

  for (const item of items) {
    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentId, siblings)
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name))
  }

  const buildSubtree = (parentId: number | null): TreeNode<T>[] => {
    const children = childrenByParent.get(parentId) ?? []
    return children.map((child) => ({
      ...child,
      children: buildSubtree(child.id),
    }))
  }

  return buildSubtree(null)
}

export function getDescendantIds<T extends { id: number; parentId: number | null }>(
  items: T[],
  rootId: number,
): number[] {
  const childrenByParent = new Map<number, number[]>()

  for (const item of items) {
    if (item.parentId === null) continue
    const children = childrenByParent.get(item.parentId) ?? []
    children.push(item.id)
    childrenByParent.set(item.parentId, children)
  }

  const descendants: number[] = [rootId]
  const stack = [...(childrenByParent.get(rootId) ?? [])]

  while (stack.length > 0) {
    const current = stack.pop()!
    descendants.push(current)
    stack.push(...(childrenByParent.get(current) ?? []))
  }

  return descendants
}

export function getPathToRoot<T extends { id: number; parentId: number | null }>(
  items: T[],
  itemId: number,
): T[] {
  const byId = new Map<number, T>()
  for (const item of items) {
    byId.set(item.id, item)
  }

  const path: T[] = []
  let currentId: number | null = itemId

  while (currentId !== null) {
    const current = byId.get(currentId)
    if (!current) break
    path.unshift(current)
    currentId = current.parentId
  }

  return path
}
