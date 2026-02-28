package commands

import (
	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
	"categories-test/internal/domain/ports"
)

type Service struct {
	products    ports.ProductCommandRepository
	categories  ports.CategoryCommandRepository
	collections ports.CollectionCommandRepository
	shops       ports.ShopCommandRepository
}

func NewService(
	products ports.ProductCommandRepository,
	categories ports.CategoryCommandRepository,
	collections ports.CollectionCommandRepository,
	shops ports.ShopCommandRepository,
) *Service {
	return &Service{
		products:    products,
		categories:  categories,
		collections: collections,
		shops:       shops,
	}
}

func (s *Service) CreateProduct(product *entity.Product) (*entity.Product, error) {
	return s.products.CreateProduct(product)
}

func (s *Service) UpdateProduct(product *entity.Product) (*entity.Product, error) {
	return s.products.UpdateProduct(product)
}

func (s *Service) DeleteProduct(id int) error {
	return s.products.DeleteProduct(id)
}

func (s *Service) CreateCategory(category *entity.Category) (*entity.Category, error) {
	return s.categories.CreateCategory(category)
}

func (s *Service) UpdateCategory(category *entity.Category) (*entity.Category, error) {
	return s.categories.UpdateCategory(category)
}

func (s *Service) DeleteCategory(id int) error {
	return s.categories.DeleteCategory(id)
}

func (s *Service) CreateCollection(collection *entity.Collection) (*entity.Collection, error) {
	return s.collections.CreateCollection(collection)
}

func (s *Service) UpdateCollection(collection *entity.Collection) (*entity.Collection, error) {
	return s.collections.UpdateCollection(collection)
}

func (s *Service) DeleteCollection(id int) error {
	return s.collections.DeleteCollection(id)
}

func (s *Service) CreateShop(shop *entity.Shop) (*entity.Shop, error) {
	return s.shops.CreateShop(shop)
}

func (s *Service) UpdateShop(shop *entity.Shop) (*entity.Shop, error) {
	return s.shops.UpdateShop(shop)
}

func (s *Service) DeleteShop(id int) error {
	return s.shops.DeleteShop(id)
}

func IsNotFound(err error) bool {
	return err == domainerrors.ErrNotFound
}

func IsCategoryInUse(err error) bool {
	return err == domainerrors.ErrCategoryInUse || err == domainerrors.ErrChildCategoryInUse
}
