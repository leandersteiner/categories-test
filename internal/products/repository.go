package products

type CommandRepository interface {
	CreateProduct(p *Product) (*Product, error)
	UpdateProduct(p *Product) (*Product, error)
	DeleteProduct(id int) error
}

type QueryRepository interface {
	GetProducts() []*Product
}
