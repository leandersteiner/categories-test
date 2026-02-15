import { Product, Category, Collection, Shop } from './types'

const API_BASE = 'http://localhost:8080/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (res.status === 204) {
    return undefined as T
  }
  return res.json()
}

export const api = {
  getProducts: () => request<Product[]>('/products'),

  createProduct: (product: Omit<Product, 'id'>) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(product) }),

  updateProduct: (product: Product) =>
    request<Product>(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) }),

  deleteProduct: (productId: number) =>
    request<void>(`/products/${productId}`, { method: 'DELETE' }),

  getCategories: () => request<Category[]>('/categories'),

  createCategory: (category: Omit<Category, 'id'>) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(category) }),

  updateCategory: (category: Category) =>
    request<Category>(`/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(category) }),

  deleteCategory: (categoryId: number) =>
    request<void>(`/categories/${categoryId}`, { method: 'DELETE' }),

  getCollections: () => request<Collection[]>('/collections'),

  createCollection: (collection: Omit<Collection, 'id'>) =>
    request<Collection>('/collections', { method: 'POST', body: JSON.stringify(collection) }),

  updateCollection: (collection: Collection) =>
    request<Collection>(`/collections/${collection.id}`, { method: 'PUT', body: JSON.stringify(collection) }),

  deleteCollection: (collectionId: number) =>
    request<void>(`/collections/${collectionId}`, { method: 'DELETE' }),

  getShops: () => request<Shop[]>('/shops'),

  getShop: (shopId: number) => request<Shop>(`/shops/${shopId}`),

  createShop: (shop: Omit<Shop, 'id'>) =>
    request<Shop>('/shops', { method: 'POST', body: JSON.stringify(shop) }),

  updateShop: (shop: Shop) =>
    request<Shop>(`/shops/${shop.id}`, { method: 'PUT', body: JSON.stringify(shop) }),

  deleteShop: (shopId: number) =>
    request<void>(`/shops/${shopId}`, { method: 'DELETE' }),

  getShopProducts: (shopId: number) =>
    request<Product[]>(`/shops/${shopId}/products`),
}
