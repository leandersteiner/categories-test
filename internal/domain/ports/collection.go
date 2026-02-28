package ports

import "categories-test/internal/domain/entity"

type CollectionCommandRepository interface {
	CreateCollection(c *entity.Collection) (*entity.Collection, error)
	UpdateCollection(c *entity.Collection) (*entity.Collection, error)
	DeleteCollection(id int) error
}

type CollectionQueryRepository interface {
	GetCollections() []*entity.Collection
}
