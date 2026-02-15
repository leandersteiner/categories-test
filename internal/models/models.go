package models

type Product struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	CategoryIDs []int   `json:"categoryIds"`
}

type Category struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	ParentID *int   `json:"parentId"`
}

type Collection struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	ParentID   *int   `json:"parentId"`
	ProductIDs []int  `json:"productIds"`
}

type Shop struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	CollectionIDs []int  `json:"collectionIds"`
}
