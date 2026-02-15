import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { Category, Collection, Product } from '../types'
import '../styles/ShopFrontend.css'

export function ShopFrontend() {
  const { shopId } = useParams<{ shopId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => api.getShop(parseInt(shopId!)),
  })

  const productsQuery = useQuery({
    queryKey: ['shopProducts', shopId],
    queryFn: () => api.getShopProducts(parseInt(shopId!)),
  })

  const collectionsQuery = useQuery({
    queryKey: ['collections'],
    queryFn: api.getCollections,
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  const shop = shopQuery.data
  const allProducts = productsQuery.data ?? []
  const collections = collectionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const buildTree = <T extends { id: number; parentId: number | null; name: string }>(
    items: T[],
    parentId: number | null = null
  ): TreeNode<T>[] => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

  const hasProductsOrDescendants = (category: Category, productIds: Set<number>): boolean => {
    if (productIds.has(category.id)) return true
    const children = categories.filter(c => c.parentId === category.id)
    return children.some(child => hasProductsOrDescendants(child, productIds))
  }

  const categoriesWithProducts = useMemo(() => {
    const ids = new Set(allProducts.flatMap(p => p.categoryIds))
    return categories.filter(c => hasProductsOrDescendants(c, ids))
  }, [categories, allProducts])

  const categoryTree = useMemo(
    () => buildTree(categoriesWithProducts),
    [categoriesWithProducts]
  )

  const getDescendantIds = (items: { id: number; parentId: number | null }[], id: number): number[] => {
    const descendants: number[] = [id]
    const children = items.filter(c => c.parentId === id)
    for (const child of children) {
      descendants.push(...getDescendantIds(items, child.id))
    }
    return descendants
  }

  const getAncestorIds = (items: { id: number; parentId: number | null }[], id: number): number[] => {
    const ancestors: number[] = [id]
    const item = items.find(c => c.id === id)
    if (item?.parentId) {
      ancestors.push(...getAncestorIds(items, item.parentId))
    }
    return ancestors
  }

  const getFilteredProducts = () => {
    let products = allProducts

    if (selectedCollection) {
      const allCollectionIds = [
        selectedCollection.id,
        ...getDescendantIds(collections, selectedCollection.id)
      ]
      const relevantCollections = collections.filter(c => allCollectionIds.includes(c.id))
      const allProductIds = new Set(relevantCollections.flatMap(c => c.productIds))
      products = products.filter(p => allProductIds.has(p.id))
    }

    if (selectedCategory) {
      const allRelatedCategoryIds = [
        ...getAncestorIds(categories, selectedCategory.id),
        ...getDescendantIds(categories, selectedCategory.id)
      ]
      products = products.filter(p =>
        p.categoryIds.some(catId => allRelatedCategoryIds.includes(catId))
      )
    }

    return products
  }

  const filteredProducts = getFilteredProducts()

  const getCategoryPath = (categoryId: number): Category[] => {
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
    ...shop?.collectionIds ?? [],
    ...(shop?.collectionIds ?? []).flatMap(id => getDescendantIds(collections, id))
  ])

  const shopCollections = collections.filter(c => allShopCollectionIds.has(c.id))

  const collectionsWithProducts = new Set(
    shopCollections.filter(c => c.productIds.length > 0).map(c => c.id)
  )

  const hasCollectionProducts = (collectionId: number): boolean => {
    if (collectionsWithProducts.has(collectionId)) return true
    const children = shopCollections.filter(c => c.parentId === collectionId)
    return children.some(child => hasCollectionProducts(child.id))
  }

  const shopCollectionsWithProducts = shopCollections.filter(c => hasCollectionProducts(c.id))
  const collectionTree = useMemo(
    () => buildTree(shopCollectionsWithProducts),
    [shopCollectionsWithProducts]
  )

  const categoryPath = selectedCategory ? getCategoryPath(selectedCategory.id) : []
  const collectionPath = selectedCollection ? getCollectionPath(selectedCollection.id) : []

  const isCollectionActive = (collectionId: number): boolean => {
    if (!selectedCollection) return false
    return collectionPath.map(c => c.id).includes(collectionId)
  }

  const isCategoryActive = (categoryId: number, collectionId?: number): boolean => {
    if (!selectedCategory || selectedCategory.id !== categoryId) return false
    if (!collectionId && !selectedCollection) return true
    if (!selectedCollection) return false
    return selectedCollection.id === collectionId
  }

  const getCollectionProductIds = (collectionId: number): number[] => {
    const descendantIds = getDescendantIds(collections, collectionId)
    const allIds = [collectionId, ...descendantIds]
    const relevantCollections = collections.filter(c => allIds.includes(c.id))
    return relevantCollections.flatMap(c => c.productIds)
  }

  const getCollectionCategories = (collectionId: number): Category[] => {
    const productIds = getCollectionProductIds(collectionId)
    const collectionProducts = allProducts.filter(p => productIds.includes(p.id))
    const categoryIds = new Set(
      collectionProducts.flatMap(p => p.categoryIds).flatMap(id => [
        id,
        ...getDescendantIds(categories, id)
      ])
    )
    return categories.filter(c => categoryIds.has(c.id))
  }

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

  return (
    <div className="shop-frontend">
      <header className="shop-header">
        <h1>{shop.name}</h1>
        <a href="/admin" className="link">Admin →</a>
      </header>

      <NavMenu
        categoryTree={categoryTree}
        collectionTree={collectionTree}
        hasCollections={shopCollections.length > 0}
        selectedCategory={selectedCategory}
        onNavigate={handleNavigate}
        getCollectionCategories={getCollectionCategories}
        isCollectionActive={isCollectionActive}
        isCategoryActive={isCategoryActive}
      />

      <div className="shop-container">
        <Sidebar
          shopCollections={shopCollections}
          categoryTree={categoryTree}
          collectionTree={collectionTree}
          hasCollections={shopCollections.length > 0}
          selectedCategory={selectedCategory}
          selectedCollection={selectedCollection}
          categoryPath={categoryPath}
          collectionPath={collectionPath}
          onSelectCategory={(category) => category ? handleNavigate(selectedCollection?.id, category.id) : handleNavigate(selectedCollection?.id)}
          onSelectCollection={(collection) => collection && handleNavigate(collection.id)}
        />

        <MainContent
          collectionPath={collectionPath}
          categoryPath={categoryPath}
          products={filteredProducts}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  )
}

interface NavMenuProps {
  categoryTree: TreeNode<Category>[]
  collectionTree: TreeNode<Collection>[]
  hasCollections: boolean
  selectedCategory: Category | null
  onNavigate: (collectionId?: number, categoryId?: number) => void
  getCollectionCategories: (id: number) => Category[]
  isCollectionActive: (id: number) => boolean
  isCategoryActive: (id: number, collectionId?: number) => boolean
}

function NavMenu({
  categoryTree,
  collectionTree,
  hasCollections,
  selectedCategory,
  onNavigate,
  getCollectionCategories,
  isCollectionActive,
  isCategoryActive,
}: NavMenuProps) {
  const buildTree = <T extends { id: number; parentId: number | null; name: string }>(
    items: T[],
    parentId: number | null = null
  ): TreeNode<T>[] => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

  const renderCategoryDropdown = (category: TreeNode<Category>, collectionId?: number, level: number = 1) => {
    if (level > 3) return null
    return (
      <div key={category.id} className={`dropdown-item level-${level}`}>
        <button
          className={`dropdown-link ${isCategoryActive(category.id, collectionId) ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(collectionId, category.id)
          }}
        >
          {category.name}
        </button>
        {category.children.length > 0 && level < 3 && (
          <div className="dropdown-submenu">
            {category.children.map(child => renderCategoryDropdown(child, collectionId, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderCollectionDropdown = (collection: TreeNode<Collection>, level: number = 1) => {
    if (level > 3) return null

    const collectionCategories = getCollectionCategories(collection.id)
    const categoryTreeForCollection = buildTree(collectionCategories)
    const hasSubItems = (collection.children.length > 0 || categoryTreeForCollection.length > 0) && level < 3

    return (
      <div key={collection.id} className={`dropdown-item level-${level}`}>
        <button
          className={`dropdown-link ${isCollectionActive(collection.id) ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(collection.id)
          }}
        >
          {collection.name}
        </button>
        {hasSubItems && (
          <div className="dropdown-submenu">
            {categoryTreeForCollection.map(cat => renderCategoryDropdown(cat, collection.id, level + 1))}
            {collection.children.map(child => renderCollectionDropdown(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (hasCollections) {
    return (
      <nav className="shop-nav">
        {collectionTree.map(collection => (
          <div key={collection.id} className="nav-dropdown">
            <button
              className={`nav-link ${isCollectionActive(collection.id) ? 'active' : ''}`}
              onClick={() => onNavigate(collection.id)}
            >
              {collection.name}
            </button>
            {(categoryTree.length > 0 || collection.children.length > 0) && (
              <div className="dropdown-content">
                {categoryTree.map(category => renderCategoryDropdown(category, collection.id, 1))}
                {collection.children.length > 0 && collection.children.map(child => renderCollectionDropdown(child, 2))}
              </div>
            )}
          </div>
        ))}
      </nav>
    )
  }

  return (
    <nav className="shop-nav">
      {categoryTree.map(category => (
        <div key={category.id} className="nav-dropdown">
          <button
            className={`nav-link ${selectedCategory?.id === category.id ? 'active' : ''}`}
            onClick={() => onNavigate(undefined, category.id)}
          >
            {category.name}
          </button>
          {category.children.length > 0 && (
            <div className="dropdown-content">
              {category.children.map(child => renderCategoryDropdown(child, undefined, 2))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

interface SidebarProps {
  shopCollections: Collection[]
  categoryTree: TreeNode<Category>[]
  collectionTree: TreeNode<Collection>[]
  hasCollections: boolean
  selectedCategory: Category | null
  selectedCollection: Collection | null
  categoryPath: Category[]
  collectionPath: Collection[]
  onSelectCategory: (category: Category | null) => void
  onSelectCollection: (collection: Collection | null) => void
}

function Sidebar({
  categoryTree,
  collectionTree,
  hasCollections,
  selectedCategory,
  selectedCollection,
  categoryPath,
  collectionPath,
  onSelectCategory,
  onSelectCollection,
}: SidebarProps) {
  const renderTree = (
    items: TreeNode<Category | Collection>[],
    onSelect: (item: Category | Collection) => void,
    selected: Category | Collection | null,
    activePath: (Category | Collection)[]
  ) => {
    const activeIds = new Set(activePath.map(item => item.id))

    return (
      <ul className="nav-tree">
        {items.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item ${activeIds.has(item.id) ? 'active' : ''}`}
              onClick={() => onSelect(item as any)}
            >
              {item.name}
            </button>
            {item.children.length > 0 && renderTree(item.children as TreeNode<Category | Collection>[], onSelect, selected, activePath)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <aside className="shop-sidebar">
      {hasCollections ? (
        <>
          <section className="nav-section">
            <h2>Collections</h2>
            <button className="clear-btn" onClick={() => onSelectCollection(null)}>All</button>
            {renderTree(collectionTree, onSelectCollection as (item: Category | Collection) => void, selectedCollection, collectionPath)}
          </section>
          <section className="nav-section">
            <h2>Categories</h2>
            <button className="clear-btn" onClick={() => onSelectCategory(null)}>All</button>
            {renderTree(categoryTree, onSelectCategory as (item: Category | Collection) => void, selectedCategory, categoryPath)}
          </section>
        </>
      ) : (
        <section className="nav-section">
          <h2>Categories</h2>
          <button className="clear-btn" onClick={() => onSelectCategory(null)}>All</button>
          {renderTree(categoryTree, onSelectCategory as (item: Category | Collection) => void, selectedCategory, categoryPath)}
        </section>
      )}
    </aside>
  )
}

interface MainContentProps {
  collectionPath: Collection[]
  categoryPath: Category[]
  products: Product[]
  onNavigate: (collectionId?: number, categoryId?: number) => void
}

function MainContent({ collectionPath, categoryPath, products, onNavigate }: MainContentProps) {
  return (
    <main className="shop-main">
      <div className="breadcrumb">
        {collectionPath.map((coll, idx) => (
          <span key={coll.id}>
            {idx > 0 && " / "}
            {idx === collectionPath.length - 1 && categoryPath.length === 0 ? (
              coll.name
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(coll.id) }}>{coll.name}</a>
            )}
          </span>
        ))}
        {categoryPath.map((cat, idx) => (
          <span key={cat.id}>
            {(collectionPath.length > 0 || idx > 0) && " / "}
            {idx === categoryPath.length - 1 ? (
              cat.name
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(collectionPath[collectionPath.length - 1]?.id, cat.id) }}>{cat.name}</a>
            )}
          </span>
        ))}
      </div>

      <div className="products-grid">
        {products.length > 0 ? (
          products.map(product => (
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
  )
}

interface TreeNode<T> {
  id: number
  name: string
  parentId: number | null
  children: TreeNode<T>[]
}
