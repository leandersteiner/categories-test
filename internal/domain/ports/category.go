package ports

import "categories-test/internal/domain/entity"

type CategoryCommandRepository interface {
	CreateCategory(c *entity.Category) (*entity.Category, error)
	UpdateCategory(c *entity.Category) (*entity.Category, error)
	DeleteCategory(id int) error
}

type CategoryQueryRepository interface {
	GetCategories() []*entity.Category
}
