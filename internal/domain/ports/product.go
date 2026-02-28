package ports

import "categories-test/internal/domain/entity"

type ProductCommandRepository interface {
	CreateProduct(p *entity.Product) (*entity.Product, error)
	UpdateProduct(p *entity.Product) (*entity.Product, error)
	DeleteProduct(id int) error
}

type ProductQueryRepository interface {
	GetProducts() []*entity.Product
}
