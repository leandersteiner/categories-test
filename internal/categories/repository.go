package categories

type CommandRepository interface {
	CreateCategory(c *Category) (*Category, error)
	UpdateCategory(c *Category) (*Category, error)
	DeleteCategory(id int) error
}

type QueryRepository interface {
	GetCategories() []*Category
}
