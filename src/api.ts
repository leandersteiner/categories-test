import { Product, Category, Collection, Shop } from './types'

const API_BASE = 'http://localhost:8080/api'

export const api = {
  // Products
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/products`)
    return res.json()
  },

  createProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
    return res.json()
  },

  updateProduct: async (product: Product): Promise<Product> => {
    const res = await fetch(`${API_BASE}/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
    return res.json()
  },

  deleteProduct: async (productId: number): Promise<void> => {
    await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
    })
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${API_BASE}/categories`)
    return res.json()
  },

  createCategory: async (category: Omit<Category, 'id'>): Promise<Category> => {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    })
    return res.json()
  },

  updateCategory: async (category: Category): Promise<Category> => {
    const res = await fetch(`${API_BASE}/categories/${category.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    })
    return res.json()
  },

  deleteCategory: async (categoryId: number): Promise<void> => {
    await fetch(`${API_BASE}/categories/${categoryId}`, {
      method: 'DELETE',
    })
  },

  // Collections
  getCollections: async (): Promise<Collection[]> => {
    const res = await fetch(`${API_BASE}/collections`)
    return res.json()
  },

  createCollection: async (collection: Omit<Collection, 'id'>): Promise<Collection> => {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collection),
    })
    return res.json()
  },

  updateCollection: async (collection: Collection): Promise<Collection> => {
    const res = await fetch(`${API_BASE}/collections/${collection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collection),
    })
    return res.json()
  },

  deleteCollection: async (collectionId: number): Promise<void> => {
    await fetch(`${API_BASE}/collections/${collectionId}`, {
      method: 'DELETE',
    })
  },

  // Shops
  getShops: async (): Promise<Shop[]> => {
    const res = await fetch(`${API_BASE}/shops`)
    return res.json()
  },

  getShop: async (shopId: number): Promise<Shop> => {
    const res = await fetch(`${API_BASE}/shops/${shopId}`)
    return res.json()
  },

  createShop: async (shop: Omit<Shop, 'id'>): Promise<Shop> => {
    const res = await fetch(`${API_BASE}/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shop),
    })
    return res.json()
  },

  updateShop: async (shop: Shop): Promise<Shop> => {
    const res = await fetch(`${API_BASE}/shops/${shop.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shop),
    })
    return res.json()
  },

  deleteShop: async (shopId: number): Promise<void> => {
    await fetch(`${API_BASE}/shops/${shopId}`, {
      method: 'DELETE',
    })
  },

  getShopProducts: async (shopId: number): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/shops/${shopId}/products`)
    return res.json()
  },
}
