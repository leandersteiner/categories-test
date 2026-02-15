import { Product, Category, Collection, Shop, PaginatedProducts } from './types'

const API_BASE = 'http://localhost:8080/api'

interface ShopProductsParams {
  collection?: number
  category?: number
  page?: number
  limit?: number
}

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
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

function buildQuery(params: Record<string, number | undefined>): string {
  const queryParts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      queryParts.push(`${key}=${value}`)
    }
  }
  return queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
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

  getShopProducts: (shopId: number, params?: ShopProductsParams) => {
    const query = buildQuery({
      collection: params?.collection,
      category: params?.category,
      page: params?.page,
      limit: params?.limit,
    })
    return request<PaginatedProducts>(`/shops/${shopId}/products${query}`)
  },

  getShopCategories: (shopId: number, collectionId?: number, direct?: boolean) => {
    const params = new URLSearchParams()
    if (collectionId) params.set('collection', collectionId.toString())
    if (direct) params.set('direct', 'true')
    const query = params.toString() ? `?${params.toString()}` : ''
    return request<Category[]>(`/shops/${shopId}/categories${query}`)
  },
}