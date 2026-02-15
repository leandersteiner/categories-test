import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Product, Category, Collection, Shop } from '../types'
import { CategoryTreeSelect } from '../components/CategoryTreeSelect'
import { CategoryTreeManager } from '../components/CategoryTreeManager'
import { useToast } from '../components/Toast'
import '../styles/Admin.css'

export function Admin() {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'collections' | 'shops'>('products')
  const { showToast } = useToast()

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: api.getProducts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.getCategories })
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: api.getCollections })
  const shopsQuery = useQuery({ queryKey: ['shops'], queryFn: api.getShops })

  const products = productsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const collections = collectionsQuery.data ?? []
  const shops = shopsQuery.data ?? []

  const isLoading = productsQuery.isLoading || categoriesQuery.isLoading || collectionsQuery.isLoading || shopsQuery.isLoading

  useEffect(() => {
    if (productsQuery.isError) {
      showToast(productsQuery.error instanceof Error ? productsQuery.error.message : 'Failed to load products', 'error')
    }
  }, [productsQuery.isError, productsQuery.error, showToast])

  useEffect(() => {
    if (categoriesQuery.isError) {
      showToast(categoriesQuery.error instanceof Error ? categoriesQuery.error.message : 'Failed to load categories', 'error')
    }
  }, [categoriesQuery.isError, categoriesQuery.error, showToast])

  useEffect(() => {
    if (collectionsQuery.isError) {
      showToast(collectionsQuery.error instanceof Error ? collectionsQuery.error.message : 'Failed to load collections', 'error')
    }
  }, [collectionsQuery.isError, collectionsQuery.error, showToast])

  useEffect(() => {
    if (shopsQuery.isError) {
      showToast(shopsQuery.error instanceof Error ? shopsQuery.error.message : 'Failed to load shops', 'error')
    }
  }, [shopsQuery.isError, shopsQuery.error, showToast])

  return (
    <div className="admin">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <a href="/" className="link">View Shops →</a>
      </header>

      <div className="admin-tabs">
        <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
          Products
        </button>
        <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
          Categories
        </button>
        <button className={activeTab === 'collections' ? 'active' : ''} onClick={() => setActiveTab('collections')}>
          Collections
        </button>
        <button className={activeTab === 'shops' ? 'active' : ''} onClick={() => setActiveTab('shops')}>
          Shops
        </button>
      </div>

      <div className="admin-content">
        {isLoading ? (
          <div className="inline-loading">
            <span className="inline-loader"></span>
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {activeTab === 'products' && <ProductsTab products={products} categories={categories} />}
            {activeTab === 'categories' && <CategoriesTab categories={categories} />}
            {activeTab === 'collections' && <CollectionsTab collections={collections} products={products} />}
            {activeTab === 'shops' && <ShopsTab shops={shops} collections={collections} />}
          </>
        )}
      </div>
    </div>
  )
}

function ProductsTab({ products, categories }: { products: Product[]; categories: Category[] }) {
  const queryClient = useQueryClient()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])

  const createMutation = useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setShowForm(false)
      setSelectedCategoryIds([])
    },
  })

  const updateMutation = useMutation({
    mutationFn: api.updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditingProduct(null)
      setSelectedCategoryIds([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setSelectedCategoryIds(product.categoryIds)
  }

  const handleCancel = () => {
    setEditingProduct(null)
    setShowForm(false)
    setSelectedCategoryIds([])
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const product = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      categoryIds: selectedCategoryIds,
    }

    if (editingProduct) {
      updateMutation.mutate({ ...product, id: editingProduct.id })
    } else {
      createMutation.mutate(product)
    }
  }

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Products</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {(showForm || editingProduct) && (
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Product Name" required defaultValue={editingProduct?.name} />
          <textarea name="description" placeholder="Description" required defaultValue={editingProduct?.description} />
          <input name="price" type="number" step="0.01" placeholder="Price" required defaultValue={editingProduct?.price} />
          <div className="form-field">
            <label className="form-label">Categories:</label>
            <CategoryTreeSelect
              categories={categories}
              selectedIds={selectedCategoryIds}
              onSelect={handleCategoryToggle}
              mode="multiple"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingProduct ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="items-list">
        {products.map(product => (
          <div key={product.id} className="item-card">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p className="price">${product.price.toFixed(2)}</p>
            <p className="meta">
              Categories: {product.categoryIds.map(id => categories.find(c => c.id === id)?.name).join(', ') || 'None'}
            </p>
            <div className="item-actions">
              <button onClick={() => handleEdit(product)} className="btn-secondary">Edit</button>
              <button onClick={() => deleteMutation.mutate(product.id)} className="btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoriesTab({ categories }: { categories: Category[] }) {
  return (
    <div className="tab-content">
      <CategoryTreeManager categories={categories} />
    </div>
  )
}

function CollectionsTab({ collections, products }: { collections: Collection[]; products: Product[] }) {
  const queryClient = useQueryClient()
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [showForm, setShowForm] = useState(false)

  const createMutation = useMutation({
    mutationFn: api.createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: api.updateCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setEditingCollection(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const productIds = formData.getAll('productIds').map(Number)
    const parentId = formData.get('parentId') as string

    const collection = {
      name: formData.get('name') as string,
      parentId: parentId ? parseInt(parentId) : null,
      productIds,
    }

    if (editingCollection) {
      updateMutation.mutate({ ...collection, id: editingCollection.id })
    } else {
      createMutation.mutate(collection)
    }
  }

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Collections</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Collection'}
        </button>
      </div>

      {(showForm || editingCollection) && (
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Collection Name" required defaultValue={editingCollection?.name} />
          <select name="parentId" defaultValue={editingCollection?.parentId ?? ''}>
            <option value="">No Parent (Top Level)</option>
            {collections.filter(c => c.id !== editingCollection?.id).map(coll => (
              <option key={coll.id} value={coll.id}>{coll.name}</option>
            ))}
          </select>
          <div className="checkbox-group">
            <label>Products:</label>
            {products.map(prod => (
              <label key={prod.id}>
                <input
                  type="checkbox"
                  name="productIds"
                  value={prod.id}
                  defaultChecked={editingCollection?.productIds.includes(prod.id)}
                />
                {prod.name}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingCollection ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setEditingCollection(null); setShowForm(false) }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="items-list">
        {collections.map(collection => (
          <div key={collection.id} className="item-card">
            <h3>{collection.name}</h3>
            <p className="meta">
              Parent: {collection.parentId ? collections.find(c => c.id === collection.parentId)?.name : 'None'}
            </p>
            <p className="meta">Products: {collection.productIds.length}</p>
            <div className="form-actions">
              <button onClick={() => setEditingCollection(collection)} className="btn-secondary">Edit</button>
              <button onClick={() => deleteMutation.mutate(collection.id)} className="btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShopsTab({ shops, collections }: { shops: Shop[]; collections: Collection[] }) {
  const queryClient = useQueryClient()
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [showForm, setShowForm] = useState(false)

  const createMutation = useMutation({
    mutationFn: api.createShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: api.updateShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      setEditingShop(null)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const collectionIds = formData.getAll('collectionIds').map(Number)

    const shop = {
      name: formData.get('name') as string,
      collectionIds,
    }

    if (editingShop) {
      updateMutation.mutate({ ...shop, id: editingShop.id })
    } else {
      createMutation.mutate(shop)
    }
  }

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Shops</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Shop'}
        </button>
      </div>

      {(showForm || editingShop) && (
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Shop Name" required defaultValue={editingShop?.name} />
          <div className="checkbox-group">
            <label>Collections (leave empty to show all products):</label>
            {collections.map(coll => (
              <label key={coll.id}>
                <input
                  type="checkbox"
                  name="collectionIds"
                  value={coll.id}
                  defaultChecked={editingShop?.collectionIds.includes(coll.id)}
                />
                {coll.name}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingShop ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setEditingShop(null); setShowForm(false) }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="items-list">
        {shops.map(shop => (
          <div key={shop.id} className="item-card">
            <h3>{shop.name}</h3>
            <p className="meta">
              Collections: {shop.collectionIds.length > 0
                ? shop.collectionIds.map(id => collections.find(c => c.id === id)?.name).join(', ')
                : 'All products (no collections)'}
            </p>
            <div className="item-actions">
              <button onClick={() => setEditingShop(shop)} className="btn-secondary">Edit</button>
              <a href={`/shop/${shop.id}`} className="btn-secondary">View Shop</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
