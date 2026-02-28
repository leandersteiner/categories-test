package categories

import (
	"fmt"
	"strings"

	"categories-test/internal/platform/db"
)

type SQLiteRepository struct {
	db *db.Client
}

func NewSQLiteRepository(client *db.Client) *SQLiteRepository {
	return &SQLiteRepository{db: client}
}

func (r *SQLiteRepository) GetCategories() []*Category {
	rows, err := r.db.Query(`SELECT id, name, parent_id FROM categories ORDER BY id;`)
	if err != nil {
		return []*Category{}
	}

	items := make([]*Category, 0, len(rows))
	for _, row := range rows {
		items = append(items, &Category{
			ID:       db.IntFrom(row, "id"),
			Name:     db.StringFrom(row, "name"),
			ParentID: db.NullableIntFrom(row, "parent_id"),
		})
	}
	return items
}

func (r *SQLiteRepository) CreateCategory(c *Category) (*Category, error) {
	rows, err := r.db.Query(fmt.Sprintf(
		"INSERT INTO categories(name, parent_id) VALUES (%s, %s); SELECT last_insert_rowid() AS id;",
		db.QuoteString(c.Name), db.NullableInt(c.ParentID),
	))
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("failed to create category")
	}
	c.ID = db.IntFrom(rows[0], "id")
	return c, nil
}

func (r *SQLiteRepository) UpdateCategory(c *Category) (*Category, error) {
	if err := r.db.Exec(fmt.Sprintf(
		"UPDATE categories SET name = %s, parent_id = %s WHERE id = %d;",
		db.QuoteString(c.Name), db.NullableInt(c.ParentID), c.ID,
	)); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *SQLiteRepository) DeleteCategory(id int) error {
	categories := r.GetCategories()
	exists := false
	for _, c := range categories {
		if c.ID == id {
			exists = true
			break
		}
	}
	if !exists {
		return ErrNotFound
	}

	descendantIDs := getDescendantIDs(categories, id)
	allIDs := append([]int{id}, descendantIDs...)

	for _, cid := range allIDs {
		rows, err := r.db.Query(fmt.Sprintf("SELECT 1 AS in_use FROM product_categories WHERE category_id = %d LIMIT 1;", cid))
		if err != nil {
			return err
		}
		if len(rows) > 0 {
			if cid == id {
				return ErrCategoryInUse
			}
			return ErrChildInUse
		}
	}

	var sb strings.Builder
	sb.WriteString("BEGIN;\n")
	for _, cid := range allIDs {
		sb.WriteString(fmt.Sprintf("DELETE FROM categories WHERE id = %d;\n", cid))
	}
	sb.WriteString("COMMIT;\n")
	return r.db.Exec(sb.String())
}

func getDescendantIDs(categories []*Category, parentID int) []int {
	result := make([]int, 0)
	for _, c := range categories {
		if c.ParentID != nil && *c.ParentID == parentID {
			result = append(result, c.ID)
			result = append(result, getDescendantIDs(categories, c.ID)...)
		}
	}
	return result
}
