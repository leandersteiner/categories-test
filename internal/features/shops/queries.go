package shops

import (
	"categories-test/internal/domain/entity"
	"categories-test/internal/domain/ports"
)

type Queries struct {
	repo ports.ShopQueryRepository
}

func NewQueries(repo ports.ShopQueryRepository) *Queries {
	return &Queries{repo: repo}
}

func (q *Queries) List() []*entity.Shop {
	return q.repo.GetShops()
}

func (q *Queries) Get(id int) (*entity.Shop, error) {
	return q.repo.GetShop(id)
}

func (q *Queries) Products(shopID int, collectionID *int, categoryID *int, page, limit int) *entity.PaginatedProducts {
	return q.repo.GetShopProducts(shopID, collectionID, categoryID, page, limit)
}

func (q *Queries) Categories(shopID int, collectionID *int, directOnly bool) []*entity.Category {
	return q.repo.GetShopCategories(shopID, collectionID, directOnly)
}
