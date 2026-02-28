package ports

import "categories-test/internal/domain/entity"

type ShopCommandRepository interface {
	CreateShop(s *entity.Shop) (*entity.Shop, error)
	UpdateShop(s *entity.Shop) (*entity.Shop, error)
	DeleteShop(id int) error
}

type ShopQueryRepository interface {
	GetShops() []*entity.Shop
	GetShop(id int) (*entity.Shop, error)
	GetShopProducts(shopID int, collectionID *int, categoryID *int, page, limit int) *entity.PaginatedProducts
	GetShopCategories(shopID int, collectionID *int, directOnly bool) []*entity.Category
}
