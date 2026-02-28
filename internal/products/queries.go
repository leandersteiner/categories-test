package products

type Queries struct {
	repo QueryRepository
}

func NewQueries(repo QueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*Product {
	return q.repo.GetProducts()
}
