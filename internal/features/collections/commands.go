package collections

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Commands struct {
	repo ports.CollectionCommandRepository
}

func NewCommands(repo ports.CollectionCommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(collection *entity.Collection) (*entity.Collection, error) {
	return c.repo.CreateCollection(collection)
}

func (c *Commands) Update(collection *entity.Collection) (*entity.Collection, error) {
	return c.repo.UpdateCollection(collection)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteCollection(id)
}
