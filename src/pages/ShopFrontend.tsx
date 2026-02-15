import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { Category, Collection } from '../types'
import '../styles/ShopFrontend.css'

export function ShopFrontend() {
  const { shopId } = useParams<{ shopId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const { data: shop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => api.getShop(parseInt(shopId!)),
  })

  const { data: allProducts = [] } = useQuery({
    queryKey: ['shopProducts', shopId],
    queryFn: () => api.getShopProducts(parseInt(shopId!)),
  })

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: api.getCollections,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  // Update selection based on URL params
  useEffect(() => {
    const collectionId = searchParams.get('collection')
    const categoryId = searchParams.get('category')

    if (collectionId) {
      const collection = collections.find(c => c.id === parseInt(collectionId))
      setSelectedCollection(collection || null)
    } else {
      setSelectedCollection(null)
    }

    if (categoryId) {
      const category = categories.find(c => c.id === parseInt(categoryId))
      setSelectedCategory(category || null)
    } else {
      setSelectedCategory(null)
    }
  }, [searchParams, collections, categories])

  const handleNavigate = (collectionId?: number, categoryId?: number) => {
    const params = new URLSearchParams()
    if (collectionId) params.set('collection', collectionId.toString())
    if (categoryId) params.set('category', categoryId.toString())
    navigate(`/shop/${shopId}?${params.toString()}`)
  }

  if (!shop) return <div>Loading...</div>

  // Get shop collections
  const shopCollections = collections.filter(c => shop.collectionIds.includes(c.id))
  const hasCollections = shopCollections.length > 0

  // Build trees
  const buildTree = (items: any[], parentId: number | null = null): any[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

  const collectionTree = buildTree(shopCollections)

  // Get all category IDs that have products
  const categoriesWithProducts = new Set(
    allProducts.flatMap(p => p.categoryIds)
  )

  // Check if a category has products or has descendants with products
  const hasProductsOrDescendants = (categoryId: number): boolean => {
    if (categoriesWithProducts.has(categoryId)) return true
    const children = categories.filter(c => c.parentId === categoryId)
    return children.some(child => hasProductsOrDescendants(child.id))
  }

  // Filter categories to only show those with products
  const categoriesWithProductsTree = categories.filter(c => hasProductsOrDescendants(c.id))
  const categoryTree = buildTree(categoriesWithProductsTree)

  // Get all descendant category IDs for a given category
  const getAllDescendantCategoryIds = (categoryId: number): number[] => {
    const descendants: number[] = [categoryId]
    const children = categories.filter(c => c.parentId === categoryId)

    for (const child of children) {
      descendants.push(...getAllDescendantCategoryIds(child.id))
    }

    return descendants
  }

  // Get all ancestor category IDs for a given category
  const getAllAncestorCategoryIds = (categoryId: number): number[] => {
    const ancestors: number[] = [categoryId]
    const category = categories.find(c => c.id === categoryId)

    if (category?.parentId) {
      ancestors.push(...getAllAncestorCategoryIds(category.parentId))
    }

    return ancestors
  }

  // Filter products
  const getFilteredProducts = () => {
    let products = allProducts

    if (selectedCollection) {
      products = products.filter(p => selectedCollection.productIds.includes(p.id))
    }

    if (selectedCategory) {
      // Get all ancestor and descendant categories
      const allRelatedCategoryIds = [
        ...getAllAncestorCategoryIds(selectedCategory.id),
        ...getAllDescendantCategoryIds(selectedCategory.id)
      ]

      // Filter products that have any of the related category IDs
      products = products.filter(p =>
        p.categoryIds.some(catId => allRelatedCategoryIds.includes(catId))
      )
    }

    return products
  }

  const filteredProducts = getFilteredProducts()

  // Get full category path for breadcrumb
  const getCategoryPath = (categoryId: number | null): Category[] => {
    if (!categoryId) return []

    const path: Category[] = []
    let currentId: number | null = categoryId

    while (currentId) {
      const category = categories.find(c => c.id === currentId)
      if (!category) break
      path.unshift(category)
      currentId = category.parentId
    }

    return path
  }

  const categoryPath = selectedCategory ? getCategoryPath(selectedCategory.id) : []

  // Render navigation menu with dropdowns
  const renderNavMenu = () => {
    if (hasCollections) {
      // Collections as top level, categories in dropdown
      return (
        <nav className="shop-nav">
          {collectionTree.map(collection => (
            <div key={collection.id} className="nav-dropdown">
              <button
                className={`nav-link ${selectedCollection?.id === collection.id && !selectedCategory ? 'active' : ''}`}
                onClick={() => handleNavigate(collection.id)}
              >
                {collection.name}
              </button>
              {categoryTree.length > 0 && (
                <div className="dropdown-content">
                  {categoryTree.map(category => renderCategoryDropdown(category, collection.id, 1))}
                </div>
              )}
            </div>
          ))}
        </nav>
      )
    } else {
      // Categories as top level (no collections)
      return (
        <nav className="shop-nav">
          {categoryTree.map(category => (
            <div key={category.id} className="nav-dropdown">
              <button
                className={`nav-link ${selectedCategory?.id === category.id ? 'active' : ''}`}
                onClick={() => handleNavigate(undefined, category.id)}
              >
                {category.name}
              </button>
              {category.children.length > 0 && (
                <div className="dropdown-content">
                  {category.children.map((child: any) => renderCategoryDropdown(child, undefined, 2))}
                </div>
              )}
            </div>
          ))}
        </nav>
      )
    }
  }

  // Recursively render category dropdown items (up to 3 levels)
  const renderCategoryDropdown = (category: any, collectionId?: number, level: number = 1) => {
    if (level > 3) return null

    return (
      <div key={category.id} className={`dropdown-item level-${level}`}>
        <button
          className={`dropdown-link ${selectedCategory?.id === category.id ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            handleNavigate(collectionId, category.id)
          }}
        >
          {category.name}
        </button>
        {category.children.length > 0 && level < 3 && (
          <div className="dropdown-submenu">
            {category.children.map((child: any) => renderCategoryDropdown(child, collectionId, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderTree = (items: any[], onSelect: (item: any) => void, selected: any) => {
    return (
      <ul className="nav-tree">
        {items.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item ${selected?.id === item.id ? 'active' : ''}`}
              onClick={() => onSelect(item)}
            >
              {item.name}
            </button>
            {item.children.length > 0 && renderTree(item.children, onSelect, selected)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="shop-frontend">
      <header className="shop-header">
        <h1>{shop.name}</h1>
        <a href="/admin" className="link">Admin →</a>
      </header>

      {renderNavMenu()}

      <div className="shop-container">
        <aside className="shop-sidebar">
          {hasCollections ? (
            <>
              <section className="nav-section">
                <h2>Collections</h2>
                <button className="clear-btn" onClick={() => setSelectedCollection(null)}>
                  All
                </button>
                {renderTree(collectionTree, setSelectedCollection, selectedCollection)}
              </section>

              <section className="nav-section">
                <h2>Categories</h2>
                <button className="clear-btn" onClick={() => setSelectedCategory(null)}>
                  All
                </button>
                {renderTree(categoryTree, setSelectedCategory, selectedCategory)}
              </section>
            </>
          ) : (
            <section className="nav-section">
              <h2>Categories</h2>
              <button className="clear-btn" onClick={() => setSelectedCategory(null)}>
                All
              </button>
              {renderTree(categoryTree, setSelectedCategory, selectedCategory)}
            </section>
          )}
        </aside>

        <main className="shop-main">
          <div className="breadcrumb">
            <span>{shop.name}</span>
            {selectedCollection && <span> / {selectedCollection.name}</span>}
            {categoryPath.map(cat => (
              <span key={cat.id}> / {cat.name}</span>
            ))}
          </div>

          <div className="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div key={product.id} className="product-card">
                  <h3>{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <p className="product-price">${product.price.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="empty-state">No products found</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
