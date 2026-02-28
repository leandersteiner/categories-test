package collections

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Queries struct {
	repo ports.CollectionQueryRepository
}

func NewQueries(repo ports.CollectionQueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*entity.Collection {
	return q.repo.GetCollections()
}
