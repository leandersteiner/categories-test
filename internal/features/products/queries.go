package products

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Queries struct {
	repo ports.ProductQueryRepository
}

func NewQueries(repo ports.ProductQueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*entity.Product {
	return q.repo.GetProducts()
}
