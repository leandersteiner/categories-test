package categories

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Queries struct {
	repo ports.CategoryQueryRepository
}

func NewQueries(repo ports.CategoryQueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*entity.Category {
	return q.repo.GetCategories()
}
