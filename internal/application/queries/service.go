package queries

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Service struct {
	products    ports.ProductQueryRepository
	categories  ports.CategoryQueryRepository
	collections ports.CollectionQueryRepository
	shops       ports.ShopQueryRepository
}

func NewService(
	products ports.ProductQueryRepository,
	categories ports.CategoryQueryRepository,
	collections ports.CollectionQueryRepository,
	shops ports.ShopQueryRepository,
) *Service {
	return &Service{
		products:    products,
		categories:  categories,
		collections: collections,
		shops:       shops,
	}
}

func (s *Service) ListProducts() []*entity.Product {
	return s.products.GetProducts()
}

func (s *Service) ListCategories() []*entity.Category {
	return s.categories.GetCategories()
}

func (s *Service) ListCollections() []*entity.Collection {
	return s.collections.GetCollections()
}

func (s *Service) ListShops() []*entity.Shop {
	return s.shops.GetShops()
}

func (s *Service) GetShop(id int) (*entity.Shop, error) {
	return s.shops.GetShop(id)
}

func (s *Service) GetShopProducts(shopID int, collectionID *int, categoryID *int, page, limit int) *entity.PaginatedProducts {
	return s.shops.GetShopProducts(shopID, collectionID, categoryID, page, limit)
}

func (s *Service) GetShopCategories(shopID int, collectionID *int, directOnly bool) []*entity.Category {
	return s.shops.GetShopCategories(shopID, collectionID, directOnly)
}
