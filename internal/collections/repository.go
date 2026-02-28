package collections

type CommandRepository interface {
	CreateCollection(c *Collection) (*Collection, error)
	UpdateCollection(c *Collection) (*Collection, error)
	DeleteCollection(id int) error
}

type QueryRepository interface {
	GetCollections() []*Collection
}
