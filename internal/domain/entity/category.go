package entity

type Category struct {
	ID       int
	Name     string
	ParentID *int
}
