package ports

import "categories-test/internal/domain/entity"

// Command side ports.
type ProductCommandRepository interface {
	CreateProduct(p *entity.Product) (*entity.Product, error)
	UpdateProduct(p *entity.Product) (*entity.Product, error)
	DeleteProduct(id int) error
}

type CategoryCommandRepository interface {
	CreateCategory(c *entity.Category) (*entity.Category, error)
	UpdateCategory(c *entity.Category) (*entity.Category, error)
	DeleteCategory(id int) error
}

type CollectionCommandRepository interface {
	CreateCollection(c *entity.Collection) (*entity.Collection, error)
	UpdateCollection(c *entity.Collection) (*entity.Collection, error)
	DeleteCollection(id int) error
}

type ShopCommandRepository interface {
	CreateShop(s *entity.Shop) (*entity.Shop, error)
	UpdateShop(s *entity.Shop) (*entity.Shop, error)
	DeleteShop(id int) error
}

// Query side ports.
type ProductQueryRepository interface {
	GetProducts() []*entity.Product
}

type CategoryQueryRepository interface {
	GetCategories() []*entity.Category
}

type CollectionQueryRepository interface {
	GetCollections() []*entity.Collection
}

type ShopQueryRepository interface {
	GetShops() []*entity.Shop
	GetShop(id int) (*entity.Shop, error)
	GetShopProducts(shopID int, collectionID *int, categoryID *int, page, limit int) *entity.PaginatedProducts
	GetShopCategories(shopID int, collectionID *int, directOnly bool) []*entity.Category
}
