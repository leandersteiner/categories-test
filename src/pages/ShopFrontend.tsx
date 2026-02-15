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

  // Build trees
  const buildTree = (items: any[], parentId: number | null = null): any[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

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

  // Get all descendant collection IDs for the shop's collections
  const getAllDescendantCollectionIds = (parentId: number): number[] => {
    const descendants: number[] = []
    const children = collections.filter(c => c.parentId === parentId)
    for (const child of children) {
      descendants.push(child.id, ...getAllDescendantCollectionIds(child.id))
    }
    return descendants
  }

  // Filter products
  const getFilteredProducts = () => {
    let products = allProducts

    if (selectedCollection) {
      const allCollectionIds = [
        selectedCollection.id,
        ...getAllDescendantCollectionIds(selectedCollection.id)
      ]
      const allRelevantCollections = collections.filter(c => allCollectionIds.includes(c.id))
      const allProductIds = new Set(allRelevantCollections.flatMap(c => c.productIds))
      products = products.filter(p => allProductIds.has(p.id))
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

  // Get full collection path for breadcrumb
  const getCollectionPath = (collectionId: number): Collection[] => {
    const path: Collection[] = []
    let currentId: number | null = collectionId

    while (currentId) {
      const collection = collections.find(c => c.id === currentId)
      if (!collection) break
      path.unshift(collection)
      currentId = collection.parentId
    }

    return path
  }

  const allShopCollectionIds = new Set([
    ...shop.collectionIds,
    ...shop.collectionIds.flatMap(id => getAllDescendantCollectionIds(id))
  ])

  const shopCollections = collections.filter(c => allShopCollectionIds.has(c.id))
  const hasCollections = shopCollections.length > 0

  // Get all collection IDs that have products directly
  const collectionsWithProducts = new Set(
    shopCollections.filter(c => c.productIds.length > 0).map(c => c.id)
  )

  // Check if a collection has products or has descendants with products
  const hasProductsOrDescendantsCollection = (collectionId: number): boolean => {
    if (collectionsWithProducts.has(collectionId)) return true
    const children = shopCollections.filter(c => c.parentId === collectionId)
    return children.some(child => hasProductsOrDescendantsCollection(child.id))
  }

  // Filter collections to only show those with products
  const shopCollectionsWithProducts = shopCollections.filter(c => hasProductsOrDescendantsCollection(c.id))
  const collectionTreeFiltered = buildTree(shopCollectionsWithProducts)

  const collectionPath = selectedCollection ? getCollectionPath(selectedCollection.id) : []

  // Check if a collection is active (selected or is ancestor of selected)
  const isCollectionActive = (collectionId: number): boolean => {
    if (!selectedCollection) return false
    const activeIds = collectionPath.map(c => c.id)
    return activeIds.includes(collectionId)
  }

  // Check if a category is active in the current collection context
  const isCategoryActiveInContext = (categoryId: number, collectionId?: number): boolean => {
    if (!selectedCategory || selectedCategory.id !== categoryId) return false
    if (!collectionId && !selectedCollection) return true
    if (!selectedCollection) return false
    
    // Check if collectionId matches the selected collection or is a descendant
    return selectedCollection.id === collectionId
  }

  // Render navigation menu with dropdowns
  const renderNavMenu = () => {
    if (hasCollections) {
      // Collections as top level, categories in dropdown
      return (
        <nav className="shop-nav">
          {collectionTreeFiltered.map(collection => (
            <div key={collection.id} className="nav-dropdown">
              <button
                className={`nav-link ${isCollectionActive(collection.id) ? 'active' : ''}`}
                onClick={() => handleNavigate(collection.id)}
              >
                {collection.name}
              </button>
              {(categoryTree.length > 0 || collection.children.length > 0) && (
                <div className="dropdown-content">
                  {categoryTree.map(category => renderCategoryDropdown(category, collection.id, 1))}
                  {collection.children.length > 0 && collection.children.map((child: any) => renderCollectionDropdown(child, 2))}
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
          className={`dropdown-link ${isCategoryActiveInContext(category.id, collectionId) ? 'active' : ''}`}
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

  // Recursively render collection dropdown items (up to 3 levels)
  const renderCollectionDropdown = (collection: any, level: number = 1) => {
    if (level > 3) return null

    const collectionProductIds = getCollectionProductIds(collection.id)
    const collectionCategoriesWithProducts = categories.filter(c => {
      const categoryProducts = allProducts.filter(p => collectionProductIds.includes(p.id))
      const categoryAndDescendants = [c.id, ...getAllDescendantCategoryIds(c.id)]
      return categoryProducts.some(p => p.categoryIds?.some(catId => categoryAndDescendants.includes(catId)))
    })
    const collectionCategoryTree = buildTree(collectionCategoriesWithProducts)

    const hasSubItems = (collection.children.length > 0 || collectionCategoryTree.length > 0) && level < 3

    return (
      <div key={collection.id} className={`dropdown-item level-${level}`}>
        <button
          className={`dropdown-link ${isCollectionActive(collection.id) ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            handleNavigate(collection.id)
          }}
        >
          {collection.name}
        </button>
        {hasSubItems && (
          <div className="dropdown-submenu">
            {collectionCategoryTree.map((category: any) => renderCategoryDropdown(category, collection.id, level + 1))}
            {collection.children.map((child: any) => renderCollectionDropdown(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const getCollectionProductIds = (collectionId: number): number[] => {
    const allDescendantIds = getAllDescendantCollectionIds(collectionId)
    const allCollectionIds = [collectionId, ...allDescendantIds]
    const relevantCollections = collections.filter(c => allCollectionIds.includes(c.id))
    return relevantCollections.flatMap(c => c.productIds)
  }

  const renderTree = (items: any[], onSelect: (item: any) => void, selected: any, activePath?: any[]) => {
    const pathToUse = activePath || collectionPath
    const getActiveIds = () => {
      if (!selected) return new Set<number>()
      return new Set(pathToUse.map((item: any) => item.id))
    }
    const activeIds = getActiveIds()

    return (
      <ul className="nav-tree">
        {items.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item ${activeIds.has(item.id) ? 'active' : ''}`}
              onClick={() => onSelect(item)}
            >
              {item.name}
            </button>
            {item.children.length > 0 && renderTree(item.children, onSelect, selected, activePath)}
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
                {renderTree(collectionTreeFiltered, setSelectedCollection, selectedCollection)}
              </section>

              <section className="nav-section">
                <h2>Categories</h2>
                <button className="clear-btn" onClick={() => setSelectedCategory(null)}>
                  All
                </button>
                {renderTree(categoryTree, setSelectedCategory, selectedCategory, categoryPath)}
              </section>
            </>
          ) : (
            <section className="nav-section">
              <h2>Categories</h2>
              <button className="clear-btn" onClick={() => setSelectedCategory(null)}>
                All
              </button>
              {renderTree(categoryTree, setSelectedCategory, selectedCategory, categoryPath)}
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
