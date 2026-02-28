package categories

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Commands struct {
	repo ports.CategoryCommandRepository
}

func NewCommands(repo ports.CategoryCommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(category *entity.Category) (*entity.Category, error) {
	return c.repo.CreateCategory(category)
}

func (c *Commands) Update(category *entity.Category) (*entity.Category, error) {
	return c.repo.UpdateCategory(category)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteCategory(id)
}
