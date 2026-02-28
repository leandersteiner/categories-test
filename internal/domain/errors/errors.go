package errors

import "errors"

var (
	ErrNotFound           = errors.New("not found")
	ErrCategoryInUse      = errors.New("category in use by products")
	ErrChildCategoryInUse = errors.New("child category in use by products")
)
