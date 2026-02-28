package entity

type PaginatedProducts struct {
	Products   []*Product
	Page       int
	Limit      int
	TotalCount int
	TotalPages int
}
