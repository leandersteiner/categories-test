package collections

type Commands struct {
	repo CommandRepository
}

func NewCommands(repo CommandRepository) *Commands {
	return &Commands{repo: repo}
}

func (c *Commands) Create(collection *Collection) (*Collection, error) {
	return c.repo.CreateCollection(collection)
}

func (c *Commands) Update(collection *Collection) (*Collection, error) {
	return c.repo.UpdateCollection(collection)
}

func (c *Commands) Delete(id int) error {
	return c.repo.DeleteCollection(id)
}
