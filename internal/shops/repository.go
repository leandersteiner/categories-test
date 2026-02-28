package shops

type CommandRepository interface {
	CreateShop(s *Shop) (*Shop, error)
	UpdateShop(s *Shop) (*Shop, error)
	DeleteShop(id int) error
}

type QueryRepository interface {
	GetShops() []*Shop
	GetShop(id int) (*Shop, error)
	GetShopProducts(shopID int, collectionID *int, categoryID *int, page, limit int) *PaginatedProducts
	GetShopCategories(shopID int, collectionID *int, directOnly bool) []*CategoryView
}
