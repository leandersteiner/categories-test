package shops

import (
	"categories-test/internal/categories"
	"categories-test/internal/products"
)

type Shop struct {
	ID            int
	Name          string
	CollectionIDs []int
}

type PaginatedProducts struct {
	Products   []*products.Product
	Page       int
	Limit      int
	TotalCount int
	TotalPages int
}

type CategoryView = categories.Category
