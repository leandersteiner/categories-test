package collections

type Queries struct {
	repo QueryRepository
}

func NewQueries(repo QueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*Collection {
	return q.repo.GetCollections()
}
