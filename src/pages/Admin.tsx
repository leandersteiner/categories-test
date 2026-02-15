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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<number | ''>('')

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === '' || product.categoryIds.includes(filterCategory as number)
    return matchesSearch && matchesCategory
  })

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

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Products</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" disabled={isMutating}>
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value === '' ? '' : Number(e.target.value))}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {(showForm || editingProduct) && (
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Product Name" required defaultValue={editingProduct?.name} disabled={isMutating} />
          <textarea name="description" placeholder="Description" required defaultValue={editingProduct?.description} disabled={isMutating} />
          <input name="price" type="number" step="0.01" placeholder="Price" required defaultValue={editingProduct?.price} disabled={isMutating} />
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
            <button type="submit" className="btn-primary" disabled={isMutating}>
              {isMutating ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-secondary" disabled={isMutating}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p>{products.length === 0 ? 'No products yet. Add your first product!' : 'No products match your search.'}</p>
        </div>
      ) : (
        <div className="data-grid">
          <div className="grid-header">
            <div className="grid-cell name">Name</div>
            <div className="grid-cell categories">Categories</div>
            <div className="grid-cell actions">Actions</div>
          </div>
          {filteredProducts.map(product => (
            <div key={product.id} className="grid-row">
              <div className="grid-cell name">
                <span className="product-name">{product.name}</span>
              </div>
              <div className="grid-cell categories">
                <div className="category-chips">
                  {product.categoryIds.length > 0 ? (
                    product.categoryIds.map(id => {
                      const cat = categories.find(c => c.id === id)
                      return cat ? <span key={id} className="category-chip">{cat.name}</span> : null
                    })
                  ) : (
                    <span className="category-chip empty">None</span>
                  )}
                </div>
              </div>
              <div className="grid-cell actions">
                <button onClick={() => handleEdit(product)} className="btn-secondary btn-sm" disabled={isMutating}>Edit</button>
                <button onClick={() => deleteMutation.mutate(product.id)} className="btn-danger btn-sm" disabled={isMutating}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoriesTab({ categories }: { categories: Category[] }) {
  return <CategoryTreeManager categories={categories} />
}

type CollectionWithChildren = Collection & { children: CollectionWithChildren[] }

function buildCollectionTree(collections: Collection[]): CollectionWithChildren[] {
  const map = new Map<number, CollectionWithChildren>()
  const roots: CollectionWithChildren[] = []

  collections.forEach(c => {
    map.set(c.id, { ...c, children: [] })
  })

  collections.forEach(c => {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function CollectionCard({
  collection,
  collections,
  products,
  onEdit,
  onDelete,
  isMutating,
  depth = 0,
}: {
  collection: CollectionWithChildren
  collections: Collection[]
  products: Product[]
  onEdit: (c: Collection) => void
  onDelete: (id: number) => void
  isMutating: boolean
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = collection.children.length > 0

  return (
    <div className="collection-item">
      <div className={`collection-card depth-${depth}`}>
        <div className="collection-card-main" onClick={() => hasChildren && setExpanded(!expanded)}>
          {hasChildren && (
            <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          )}
          {!hasChildren && <span className="expand-placeholder" />}
          <div className="collection-info">
            <div className="collection-header-row">
              <h3>{collection.name}</h3>
              <span className="collection-count">{collection.productIds.length} products</span>
            </div>
          </div>
        </div>
        <div className="collection-actions">
          <button onClick={() => onEdit(collection)} className="btn-secondary btn-sm" disabled={isMutating}>Edit</button>
          <button onClick={() => onDelete(collection.id)} className="btn-danger btn-sm" disabled={isMutating}>Delete</button>
        </div>
      </div>
      {expanded && collection.children.length > 0 && (
        <div className="collection-children">
          {collection.children.map(child => (
            <CollectionCard
              key={child.id}
              collection={child}
              collections={collections}
              products={products}
              onEdit={onEdit}
              onDelete={onDelete}
              isMutating={isMutating}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CollectionsTab({ collections, products }: { collections: Collection[]; products: Product[] }) {
  const queryClient = useQueryClient()
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const collectionTree = buildCollectionTree(filteredCollections)

  const createMutation = useMutation({
    mutationFn: api.createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setShowForm(false)
      setSelectedProducts([])
    },
  })

  const updateMutation = useMutation({
    mutationFn: api.updateCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setEditingCollection(null)
      setSelectedProducts([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection)
    setSelectedProducts(collection.productIds)
  }

  const handleCancel = () => {
    setEditingCollection(null)
    setShowForm(false)
    setSelectedProducts([])
  }

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const parentId = formData.get('parentId') as string

    const collection = {
      name: formData.get('name') as string,
      parentId: parentId ? parseInt(parentId) : null,
      productIds: selectedProducts,
    }

    if (editingCollection) {
      updateMutation.mutate({ ...collection, id: editingCollection.id })
    } else {
      createMutation.mutate(collection)
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Collections</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" disabled={isMutating}>
          {showForm ? 'Cancel' : 'Add Collection'}
        </button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {(showForm || editingCollection) && (
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Collection Name" required defaultValue={editingCollection?.name} disabled={isMutating} />
          <select name="parentId" defaultValue={editingCollection?.parentId ?? ''} disabled={isMutating}>
            <option value="">No Parent (Top Level)</option>
            {collections.filter(c => c.id !== editingCollection?.id).map(coll => (
              <option key={coll.id} value={coll.id}>{coll.name}</option>
            ))}
          </select>
          <div className="form-field">
            <label className="form-label">Products ({selectedProducts.length} selected):</label>
            <div className="product-select-grid">
              {products.map(prod => (
                <label key={prod.id} className="product-select-item">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(prod.id)}
                    onChange={() => handleProductToggle(prod.id)}
                    disabled={isMutating}
                  />
                  <span className="product-name">{prod.name}</span>
                </label>
              ))}
              {products.length === 0 && (
                <p className="no-products">No products available. Create products first.</p>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isMutating}>
              {isMutating ? 'Saving...' : editingCollection ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-secondary" disabled={isMutating}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {filteredCollections.length === 0 ? (
        <div className="empty-state">
          <p>{collections.length === 0 ? 'No collections yet. Add your first collection!' : 'No collections match your search.'}</p>
        </div>
      ) : (
        <div className="collections-tree">
          {collectionTree.map(collection => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              collections={filteredCollections}
              products={products}
              onEdit={handleEdit}
              onDelete={(id: number) => deleteMutation.mutate(id)}
              isMutating={isMutating}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ShopsTab({ shops, collections }: { shops: Shop[]; collections: Collection[] }) {
  const queryClient = useQueryClient()
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollections, setSelectedCollections] = useState<number[]>([])

  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: api.createShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      setShowForm(false)
      setSelectedCollections([])
    },
  })

  const updateMutation = useMutation({
    mutationFn: api.updateShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      setEditingShop(null)
      setSelectedCollections([])
    },
  })

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop)
    setSelectedCollections(shop.collectionIds)
  }

  const handleCancel = () => {
    setEditingShop(null)
    setShowForm(false)
    setSelectedCollections([])
  }

  const handleCollectionToggle = (collectionId: number) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const shop = {
      name: formData.get('name') as string,
      collectionIds: selectedCollections,
    }

    if (editingShop) {
      updateMutation.mutate({ ...shop, id: editingShop.id })
    } else {
      createMutation.mutate(shop)
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Shops</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" disabled={isMutating}>
          {showForm ? 'Cancel' : 'Add Shop'}
        </button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search shops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {(showForm || editingShop) && (
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Shop Name" required defaultValue={editingShop?.name} disabled={isMutating} />
          <div className="form-field">
            <label className="form-label">Collections ({selectedCollections.length} selected):</label>
            <p className="form-hint">Leave empty to show all products</p>
            <div className="product-select-grid">
              {collections.map(coll => (
                <label key={coll.id} className="product-select-item">
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(coll.id)}
                    onChange={() => handleCollectionToggle(coll.id)}
                    disabled={isMutating}
                  />
                  <span className="product-name">{coll.name}</span>
                </label>
              ))}
              {collections.length === 0 && (
                <p className="no-products">No collections available. Create collections first.</p>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isMutating}>
              {isMutating ? 'Saving...' : editingShop ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-secondary" disabled={isMutating}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {filteredShops.length === 0 ? (
        <div className="empty-state">
          <p>{shops.length === 0 ? 'No shops yet. Add your first shop!' : 'No shops match your search.'}</p>
        </div>
      ) : (
        <div className="data-grid">
          <div className="grid-header">
            <div className="grid-cell name">Name</div>
            <div className="grid-cell collections">Collections</div>
            <div className="grid-cell actions">Actions</div>
          </div>
          {filteredShops.map(shop => (
            <div key={shop.id} className="grid-row">
              <div className="grid-cell name">
                <span className="shop-name">{shop.name}</span>
              </div>
              <div className="grid-cell collections">
                <div className="collection-chips">
                  {shop.collectionIds.length > 0 ? (
                    shop.collectionIds.map(id => {
                      const coll = collections.find(c => c.id === id)
                      return coll ? <span key={id} className="category-chip">{coll.name}</span> : null
                    })
                  ) : (
                    <span className="category-chip empty">All products</span>
                  )}
                </div>
              </div>
              <div className="grid-cell actions">
                <button onClick={() => handleEdit(shop)} className="btn-secondary btn-sm" disabled={isMutating}>Edit</button>
                <a href={`/shop/${shop.id}`} className="btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">View</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
