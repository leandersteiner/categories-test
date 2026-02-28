package categories

type Commands struct {
	repo CommandRepository
}

func NewCommands(repo CommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(category *Category) (*Category, error) {
	return c.repo.CreateCategory(category)
}

func (c *Commands) Update(category *Category) (*Category, error) {
	return c.repo.UpdateCategory(category)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteCategory(id)
}
