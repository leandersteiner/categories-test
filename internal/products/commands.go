package products

type Commands struct {
	repo CommandRepository
}

func NewCommands(repo CommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(product *Product) (*Product, error) {
	return c.repo.CreateProduct(product)
}

func (c *Commands) Update(product *Product) (*Product, error) {
	return c.repo.UpdateProduct(product)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteProduct(id)
}
