package categories

type Queries struct {
	repo QueryRepository
}

func NewQueries(repo QueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*Category {
	return q.repo.GetCategories()
}
