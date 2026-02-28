package shops

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Commands struct {
	repo ports.ShopCommandRepository
}

func NewCommands(repo ports.ShopCommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(shop *entity.Shop) (*entity.Shop, error) {
	return c.repo.CreateShop(shop)
}

func (c *Commands) Update(shop *entity.Shop) (*entity.Shop, error) {
	return c.repo.UpdateShop(shop)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteShop(id)
}
