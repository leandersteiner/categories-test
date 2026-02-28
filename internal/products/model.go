package products

type Product struct {
	ID          int
	Name        string
	Description string
	Price       float64
	CategoryIDs []int
}
