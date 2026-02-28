package shops

type Queries struct {
	repo QueryRepository
}

func NewQueries(repo QueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*Shop {
	return q.repo.GetShops()
}

func (q *Queries) Get(id int) (*Shop, error) {
	return q.repo.GetShop(id)
}

func (q *Queries) Products(shopID int, collectionID *int, categoryID *int, page, limit int) *PaginatedProducts {
	return q.repo.GetShopProducts(shopID, collectionID, categoryID, page, limit)
}

func (q *Queries) Categories(shopID int, collectionID *int, directOnly bool) []*CategoryView {
	return q.repo.GetShopCategories(shopID, collectionID, directOnly)
}
