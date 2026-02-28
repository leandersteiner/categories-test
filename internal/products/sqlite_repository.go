package products

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

func (r *SQLiteRepository) GetProducts() []*Product {
	rows, err := r.db.Query(`SELECT id, name, description, price FROM products ORDER BY id;`)
	if err != nil {
		return []*Product{}
	}

	categoryRows, err := r.db.Query(`SELECT product_id, category_id FROM product_categories ORDER BY product_id, category_id;`)
	if err != nil {
		categoryRows = []map[string]interface{}{}
	}

	categoriesByProduct := make(map[int][]int)
	for _, row := range categoryRows {
		pid := db.IntFrom(row, "product_id")
		cid := db.IntFrom(row, "category_id")
		categoriesByProduct[pid] = append(categoriesByProduct[pid], cid)
	}

	products := make([]*Product, 0, len(rows))
	for _, row := range rows {
		id := db.IntFrom(row, "id")
		categoryIDs := categoriesByProduct[id]
		if categoryIDs == nil {
			categoryIDs = []int{}
		}
		products = append(products, &Product{
			ID:          id,
			Name:        db.StringFrom(row, "name"),
			Description: db.StringFrom(row, "description"),
			Price:       db.FloatFrom(row, "price"),
			CategoryIDs: categoryIDs,
		})
	}

	return products
}

func (r *SQLiteRepository) CreateProduct(p *Product) (*Product, error) {
	var sb strings.Builder
	sb.WriteString("BEGIN;\n")
	sb.WriteString(fmt.Sprintf(
		"INSERT INTO products(name, description, price) VALUES (%s, %s, %f);\n",
		db.QuoteString(p.Name), db.QuoteString(p.Description), p.Price,
	))
	sb.WriteString("SELECT last_insert_rowid() AS id;\n")
	sb.WriteString("COMMIT;\n")

	rows, err := r.db.Query(sb.String())
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("failed to create product")
	}
	p.ID = db.IntFrom(rows[0], "id")

	if len(p.CategoryIDs) > 0 {
		sb.Reset()
		sb.WriteString("BEGIN;\n")
		for _, categoryID := range p.CategoryIDs {
			sb.WriteString(fmt.Sprintf("INSERT INTO product_categories(product_id, category_id) VALUES (%d, %d);\n", p.ID, categoryID))
		}
		sb.WriteString("COMMIT;\n")
		if err := r.db.Exec(sb.String()); err != nil {
			return nil, err
		}
	}

	return p, nil
}

func (r *SQLiteRepository) UpdateProduct(p *Product) (*Product, error) {
	var sb strings.Builder
	sb.WriteString("BEGIN;\n")
	sb.WriteString(fmt.Sprintf(
		"UPDATE products SET name = %s, description = %s, price = %f WHERE id = %d;\n",
		db.QuoteString(p.Name), db.QuoteString(p.Description), p.Price, p.ID,
	))
	sb.WriteString("DELETE FROM product_categories WHERE product_id = " + fmt.Sprintf("%d", p.ID) + ";\n")
	for _, categoryID := range p.CategoryIDs {
		sb.WriteString(fmt.Sprintf("INSERT INTO product_categories(product_id, category_id) VALUES (%d, %d);\n", p.ID, categoryID))
	}
	sb.WriteString("COMMIT;\n")

	if err := r.db.Exec(sb.String()); err != nil {
		return nil, err
	}
	return p, nil
}

func (r *SQLiteRepository) DeleteProduct(id int) error {
	rows, err := r.db.Query(fmt.Sprintf("DELETE FROM products WHERE id = %d; SELECT changes() AS affected;", id))
	if err != nil {
		return err
	}
	if len(rows) == 0 || db.IntFrom(rows[0], "affected") == 0 {
		return ErrNotFound
	}
	return nil
}
