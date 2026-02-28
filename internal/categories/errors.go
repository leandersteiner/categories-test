package categories

import "errors"

var (
	ErrNotFound      = errors.New("category not found")
	ErrCategoryInUse = errors.New("category in use by products")
	ErrChildInUse    = errors.New("child category in use by products")
)
