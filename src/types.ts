export interface Product {
  id: number
  name: string
  description: string
  price: number
  categoryIds: number[]
}

export interface Category {
  id: number
  name: string
  parentId: number | null
}

export interface Collection {
  id: number
  name: string
  parentId: number | null
  productIds: number[]
}

export interface Shop {
  id: number
  name: string
  collectionIds: number[]
}

export interface TreeNode<T> {
  id: number
  name: string
  parentId: number | null
  children: TreeNode<T>[]
}

export interface CategoryTreeNode extends TreeNode<Category> {
  categoryIds?: number[]
}

export interface CollectionTreeNode extends TreeNode<Collection> {
  productIds: number[]
}
