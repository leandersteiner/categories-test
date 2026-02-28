package shops

type Commands struct {
	repo CommandRepository
}

func NewCommands(repo CommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(shop *Shop) (*Shop, error) {
	return c.repo.CreateShop(shop)
}

func (c *Commands) Update(shop *Shop) (*Shop, error) {
	return c.repo.UpdateShop(shop)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteShop(id)
}
