package products

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Commands struct {
	repo ports.ProductCommandRepository
}

func NewCommands(repo ports.ProductCommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(product *entity.Product) (*entity.Product, error) {
	return c.repo.CreateProduct(product)
}

func (c *Commands) Update(product *entity.Product) (*entity.Product, error) {
	return c.repo.UpdateProduct(product)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteProduct(id)
}
