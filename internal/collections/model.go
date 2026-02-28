package collections

type Collection struct {
	ID         int
	Name       string
	ParentID   *int
	ProductIDs []int
}
