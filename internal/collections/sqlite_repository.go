package collections

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

func (r *SQLiteRepository) GetCollections() []*Collection {
	rows, err := r.db.Query(`SELECT id, name, parent_id FROM collections ORDER BY id;`)
	if err != nil {
		return []*Collection{}
	}

	productRows, err := r.db.Query(`SELECT collection_id, product_id FROM collection_products ORDER BY collection_id, product_id;`)
	if err != nil {
		productRows = []map[string]interface{}{}
	}
	productsByCollection := make(map[int][]int)
	for _, row := range productRows {
		cid := db.IntFrom(row, "collection_id")
		pid := db.IntFrom(row, "product_id")
		productsByCollection[cid] = append(productsByCollection[cid], pid)
	}

	items := make([]*Collection, 0, len(rows))
	for _, row := range rows {
		id := db.IntFrom(row, "id")
		items = append(items, &Collection{
			ID:         id,
			Name:       db.StringFrom(row, "name"),
			ParentID:   db.NullableIntFrom(row, "parent_id"),
			ProductIDs: productsByCollection[id],
		})
	}
	return items
}

func (r *SQLiteRepository) CreateCollection(c *Collection) (*Collection, error) {
	rows, err := r.db.Query(fmt.Sprintf(
		"INSERT INTO collections(name, parent_id) VALUES (%s, %s); SELECT last_insert_rowid() AS id;",
		db.QuoteString(c.Name), db.NullableInt(c.ParentID),
	))
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("failed to create collection")
	}
	c.ID = db.IntFrom(rows[0], "id")

	if len(c.ProductIDs) > 0 {
		var sb strings.Builder
		sb.WriteString("BEGIN;\n")
		for _, pid := range c.ProductIDs {
			sb.WriteString(fmt.Sprintf("INSERT INTO collection_products(collection_id, product_id) VALUES (%d, %d);\n", c.ID, pid))
		}
		sb.WriteString("COMMIT;\n")
		if err := r.db.Exec(sb.String()); err != nil {
			return nil, err
		}
	}

	return c, nil
}

func (r *SQLiteRepository) UpdateCollection(c *Collection) (*Collection, error) {
	var sb strings.Builder
	sb.WriteString("BEGIN;\n")
	sb.WriteString(fmt.Sprintf(
		"UPDATE collections SET name = %s, parent_id = %s WHERE id = %d;\n",
		db.QuoteString(c.Name), db.NullableInt(c.ParentID), c.ID,
	))
	sb.WriteString(fmt.Sprintf("DELETE FROM collection_products WHERE collection_id = %d;\n", c.ID))
	for _, pid := range c.ProductIDs {
		sb.WriteString(fmt.Sprintf("INSERT INTO collection_products(collection_id, product_id) VALUES (%d, %d);\n", c.ID, pid))
	}
	sb.WriteString("COMMIT;\n")

	if err := r.db.Exec(sb.String()); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *SQLiteRepository) DeleteCollection(id int) error {
	rows, err := r.db.Query(fmt.Sprintf("DELETE FROM collections WHERE id = %d; SELECT changes() AS affected;", id))
	if err != nil {
		return err
	}
	if len(rows) == 0 || db.IntFrom(rows[0], "affected") == 0 {
		return ErrNotFound
	}
	return nil
}
