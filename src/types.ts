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
