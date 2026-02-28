import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { api } from '../api'
import { Category, Collection, Product, TreeNode } from '../types'
import { useQueryErrorToast } from '../hooks/useQueryErrorToast'
import { buildTree, getDescendantIds, getPathToRoot } from '../utils/tree'
import '../styles/ShopFrontend.css'

export function ShopFrontend() {
  const { shopId } = useParams<{ shopId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [page, setPage] = useState(1)

  const collectionId = searchParams.get('collection')
  const categoryId = searchParams.get('category')

  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => api.getShop(parseInt(shopId!)),
    enabled: !!shopId,
  })

  const productsQuery = useQuery({
    queryKey: ['shopProducts', shopId, collectionId || 'none', categoryId || 'none', page],
    queryFn: () => api.getShopProducts(parseInt(shopId!), {
      collection: collectionId ? parseInt(collectionId) : undefined,
      category: categoryId ? parseInt(categoryId) : undefined,
      page,
      limit: 20,
    }),
    enabled: !!shopId,
    staleTime: 0,
  })

  const collectionsQuery = useQuery({
    queryKey: ['collections'],
    queryFn: api.getCollections,
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  const shopCategoriesQuery = useQuery({
    queryKey: ['shopCategories', shopId, collectionId],
    queryFn: () => api.getShopCategories(parseInt(shopId!), collectionId ? parseInt(collectionId) : undefined),
    enabled: !!shopId,
  })

  useQueryErrorToast(shopQuery, 'Failed to load shop')
  useQueryErrorToast(productsQuery, 'Failed to load products')
  useQueryErrorToast(collectionsQuery, 'Failed to load collections')
  useQueryErrorToast(categoriesQuery, 'Failed to load categories')
  useQueryErrorToast(shopCategoriesQuery, 'Failed to load shop categories')

  const shop = shopQuery.data
  const productsData = productsQuery.data
  const products = productsData?.products ?? []
  const collections = collectionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const collectionCategoriesQueries = useQueries({
    queries: collections.map(collection => ({
      queryKey: ['shopCategories', shopId, collection.id, true],
      queryFn: () => api.getShopCategories(parseInt(shopId!), collection.id, true),
      enabled: !!shopId,
    }))
  })

  const getCategoriesForCollection = (collectionId: number): Category[] => {
    const query = collectionCategoriesQueries.find((_, idx) => collections[idx]?.id === collectionId)
    return query?.data ?? shopCategories
  }

  const totalPages = productsData?.totalPages ?? 0
  const totalCount = productsData?.totalCount ?? 0

  const shopCategories = shopCategoriesQuery.data ?? []

  const categoryTree = useMemo(
    () => buildTree(shopCategories),
    [shopCategories]
  )

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
      const categoryIdNum = parseInt(categoryId)
      const category = categories.find(c => c.id === categoryIdNum)
      if (category) {
        setSelectedCategory(category)
      } else {
        setSelectedCategory(null)
      }
    } else {
      setSelectedCategory(null)
    }
    setPage(1)
  }, [searchParams, collections, categories])

  const categoryPath = selectedCategory ? getPathToRoot(categories, selectedCategory.id) : []
  const collectionPath = selectedCollection ? getPathToRoot(collections, selectedCollection.id) : []

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

  const getCollectionCategories = (collectionId?: number): Category[] => {
    if (!selectedCollection && !collectionId) {
      return shopCategories
    }
    if (collectionId) {
      return getCategoriesForCollection(collectionId)
    }
    return shopCategoriesQuery.data ?? shopCategories
  }

  const handleNavigate = (collectionId?: number, categoryId?: number) => {
    const params = new URLSearchParams()
    if (collectionId) params.set('collection', collectionId.toString())
    if (categoryId) params.set('category', categoryId.toString())
    navigate(`/shop/${shopId}?${params.toString()}`)
    setPage(1)
  }

  return (
    <div className="shop-frontend">
      <header className="shop-header">
        <h1>
          {shop ? shop.name : 'Loading...'}
          {shopQuery.isLoading && <span className="inline-loader"></span>}
        </h1>
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
        isLoading={categoriesQuery.isLoading || collectionsQuery.isLoading}
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
          getCollectionCategories={getCollectionCategories}
          onSelectCategory={(category) => category ? handleNavigate(selectedCollection?.id, category.id) : handleNavigate(selectedCollection?.id)}
          onSelectCollection={(collection) => handleNavigate(collection?.id)}
          isLoading={categoriesQuery.isLoading || collectionsQuery.isLoading}
        />

        <MainContent
          collectionPath={collectionPath}
          categoryPath={categoryPath}
          products={products}
          onNavigate={handleNavigate}
          isLoading={productsQuery.isLoading}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
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
  getCollectionCategories: (collectionId?: number) => Category[]
  isCollectionActive: (collectionId: number) => boolean
  isCategoryActive: (categoryId: number, collectionId?: number) => boolean
  isLoading: boolean
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
  isLoading,
}: NavMenuProps) {
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

  if (isLoading) {
    return (
      <nav className="shop-nav">
        <div className="inline-loading">
          <span className="inline-loader"></span>
          <span>Loading...</span>
        </div>
      </nav>
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
  getCollectionCategories: () => Category[]
  onSelectCategory: (category: Category | null) => void
  onSelectCollection: (collection: Collection | null) => void
  isLoading: boolean
}

function Sidebar({
  categoryTree,
  collectionTree,
  hasCollections,
  selectedCategory,
  selectedCollection,
  categoryPath,
  collectionPath,
  getCollectionCategories,
  onSelectCategory,
  onSelectCollection,
  isLoading,
}: SidebarProps) {
  const displayedCategories = selectedCollection
    ? buildTree(getCollectionCategories())
    : categoryTree

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
      {isLoading ? (
        <div className="inline-loading">
          <span className="inline-loader"></span>
          <span>Loading...</span>
        </div>
      ) : hasCollections ? (
        <>
          <section className="nav-section">
            <h2>Collections</h2>
            <button className="clear-btn" onClick={() => onSelectCollection(null)}>All</button>
            {renderTree(collectionTree, onSelectCollection as (item: Category | Collection) => void, selectedCollection, collectionPath)}
          </section>
          <section className="nav-section">
            <h2>Categories</h2>
            <button className="clear-btn" onClick={() => onSelectCategory(null)}>All</button>
            {renderTree(displayedCategories, onSelectCategory as (item: Category | Collection) => void, selectedCategory, categoryPath)}
          </section>
        </>
      ) : (
        <section className="nav-section">
          <h2>Categories</h2>
          <button className="clear-btn" onClick={() => onSelectCategory(null)}>All</button>
          {renderTree(displayedCategories, onSelectCategory as (item: Category | Collection) => void, selectedCategory, categoryPath)}
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
  isLoading: boolean
  page: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

function MainContent({ collectionPath, categoryPath, products, onNavigate, isLoading, page, totalPages, totalCount, onPageChange }: MainContentProps) {
  const hasBreadcrumbs = collectionPath.length > 0 || categoryPath.length > 0

  return (
    <main className="shop-main">
      {hasBreadcrumbs && (
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
      )}

      <div className="products-grid">
        {isLoading ? (
          <div className="inline-loading">
            <span className="inline-loader"></span>
            <span>Loading products...</span>
          </div>
        ) : products.length > 0 ? (
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages} ({totalCount} products)
          </span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}
