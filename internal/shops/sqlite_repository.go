package shops

import (
	"fmt"
	"sort"

	"categories-test/internal/collections"
	"categories-test/internal/platform/db"
	"categories-test/internal/products"
)

type SQLiteRepository struct {
	db *db.Client
}

func NewSQLiteRepository(client *db.Client) *SQLiteRepository {
	return &SQLiteRepository{db: client}
}

func (r *SQLiteRepository) GetShops() []*Shop {
	rows, err := r.db.Query(`SELECT id, name FROM shops ORDER BY id;`)
	if err != nil {
		return []*Shop{}
	}

	linkRows, err := r.db.Query(`SELECT shop_id, collection_id FROM shop_collections ORDER BY shop_id, collection_id;`)
	if err != nil {
		linkRows = []map[string]interface{}{}
	}
	collectionsByShop := make(map[int][]int)
	for _, row := range linkRows {
		sid := db.IntFrom(row, "shop_id")
		cid := db.IntFrom(row, "collection_id")
		collectionsByShop[sid] = append(collectionsByShop[sid], cid)
	}

	items := make([]*Shop, 0, len(rows))
	for _, row := range rows {
		id := db.IntFrom(row, "id")
		items = append(items, &Shop{ID: id, Name: db.StringFrom(row, "name"), CollectionIDs: collectionsByShop[id]})
	}
	return items
}

func (r *SQLiteRepository) GetShop(id int) (*Shop, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT id, name FROM shops WHERE id = %d LIMIT 1;`, id))
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, ErrNotFound
	}

	shop := &Shop{ID: db.IntFrom(rows[0], "id"), Name: db.StringFrom(rows[0], "name")}
	shop.CollectionIDs = r.getCollectionIDsForShop(shop.ID)
	return shop, nil
}

func (r *SQLiteRepository) CreateShop(s *Shop) (*Shop, error) {
	rows, err := r.db.Query(fmt.Sprintf("INSERT INTO shops(name) VALUES (%s); SELECT last_insert_rowid() AS id;", db.QuoteString(s.Name)))
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("failed to create shop")
	}
	s.ID = db.IntFrom(rows[0], "id")

	if len(s.CollectionIDs) > 0 {
		sql := "BEGIN;\n"
		for _, cid := range s.CollectionIDs {
			sql += fmt.Sprintf("INSERT INTO shop_collections(shop_id, collection_id) VALUES (%d, %d);\n", s.ID, cid)
		}
		sql += "COMMIT;"
		if err := r.db.Exec(sql); err != nil {
			return nil, err
		}
	}

	return s, nil
}

func (r *SQLiteRepository) UpdateShop(s *Shop) (*Shop, error) {
	sql := "BEGIN;\n"
	sql += fmt.Sprintf("UPDATE shops SET name = %s WHERE id = %d;\n", db.QuoteString(s.Name), s.ID)
	sql += fmt.Sprintf("DELETE FROM shop_collections WHERE shop_id = %d;\n", s.ID)
	for _, cid := range s.CollectionIDs {
		sql += fmt.Sprintf("INSERT INTO shop_collections(shop_id, collection_id) VALUES (%d, %d);\n", s.ID, cid)
	}
	sql += "COMMIT;"
	if err := r.db.Exec(sql); err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SQLiteRepository) DeleteShop(id int) error {
	rows, err := r.db.Query(fmt.Sprintf("DELETE FROM shops WHERE id = %d; SELECT changes() AS affected;", id))
	if err != nil {
		return err
	}
	if len(rows) == 0 || db.IntFrom(rows[0], "affected") == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SQLiteRepository) GetShopProducts(shopID int, collectionID *int, categoryID *int, page, limit int) *PaginatedProducts {
	shop, err := r.GetShop(shopID)
	if err != nil {
		return &PaginatedProducts{Products: []*products.Product{}, Page: page, Limit: limit, TotalCount: 0, TotalPages: 0}
	}

	collectionsByID := r.getCollectionsByID()
	productsByID := r.getProductsByID()
	productCategoryIDs := r.getProductCategoryMap()

	productMap := make(map[int]bool)
	if collectionID != nil {
		collIDs := []int{*collectionID}
		collIDs = append(collIDs, getDescendantCollectionIDs(collectionsByID, *collectionID)...)
		for _, id := range collIDs {
			if c, ok := collectionsByID[id]; ok {
				for _, pid := range c.ProductIDs {
					productMap[pid] = true
				}
			}
		}
	} else if len(shop.CollectionIDs) > 0 {
		for _, id := range shop.CollectionIDs {
			if c, ok := collectionsByID[id]; ok {
				for _, pid := range c.ProductIDs {
					productMap[pid] = true
				}
			}
		}
	} else {
		for id := range productsByID {
			productMap[id] = true
		}
	}

	if categoryID != nil {
		catIDs := append(getDescendantCategoryIDs(r.getCategoriesByID(), *categoryID), *categoryID)
		catSet := make(map[int]bool)
		for _, cid := range catIDs {
			catSet[cid] = true
		}
		filtered := make(map[int]bool)
		for pid := range productMap {
			for _, cid := range productCategoryIDs[pid] {
				if catSet[cid] {
					filtered[pid] = true
					break
				}
			}
		}
		productMap = filtered
	}

	matchedProducts := make([]*products.Product, 0, len(productMap))
	for pid := range productMap {
		if p, ok := productsByID[pid]; ok {
			matchedProducts = append(matchedProducts, p)
		}
	}
	sort.Slice(matchedProducts, func(i, j int) bool { return matchedProducts[i].ID < matchedProducts[j].ID })

	totalCount := len(matchedProducts)
	totalPages := (totalCount + limit - 1) / limit
	start := (page - 1) * limit
	end := start + limit
	if start > totalCount {
		start = totalCount
	}
	if end > totalCount {
		end = totalCount
	}

	paged := matchedProducts
	if start < end {
		paged = matchedProducts[start:end]
	} else {
		paged = []*products.Product{}
	}

	return &PaginatedProducts{Products: paged, Page: page, Limit: limit, TotalCount: totalCount, TotalPages: totalPages}
}

func (r *SQLiteRepository) GetShopCategories(shopID int, collectionID *int, directOnly bool) []*CategoryView {
	shop, err := r.GetShop(shopID)
	if err != nil {
		return []*CategoryView{}
	}

	collectionsByID := r.getCollectionsByID()
	productsByID := r.getProductsByID()
	productCategoryIDs := r.getProductCategoryMap()
	categoriesByID := r.getCategoriesByID()

	productMap := make(map[int]bool)
	if collectionID != nil {
		collIDs := []int{*collectionID}
		if !directOnly {
			collIDs = append(collIDs, getDescendantCollectionIDs(collectionsByID, *collectionID)...)
		}
		for _, id := range collIDs {
			if c, ok := collectionsByID[id]; ok {
				for _, pid := range c.ProductIDs {
					productMap[pid] = true
				}
			}
		}
	} else if len(shop.CollectionIDs) > 0 {
		for _, id := range shop.CollectionIDs {
			if c, ok := collectionsByID[id]; ok {
				for _, pid := range c.ProductIDs {
					productMap[pid] = true
				}
			}
		}
	} else {
		for id := range productsByID {
			productMap[id] = true
		}
	}

	catMap := make(map[int]*CategoryView)
	for pid := range productMap {
		for _, cid := range productCategoryIDs[pid] {
			if c, ok := categoriesByID[cid]; ok {
				catMap[cid] = c
			}
		}
	}

	result := make([]*CategoryView, 0, len(catMap))
	for _, c := range catMap {
		result = append(result, c)
	}
	return result
}

func (r *SQLiteRepository) getCollectionIDsForShop(shopID int) []int {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT collection_id FROM shop_collections WHERE shop_id = %d ORDER BY collection_id;`, shopID))
	if err != nil {
		return []int{}
	}
	ids := make([]int, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, db.IntFrom(row, "collection_id"))
	}
	return ids
}

func (r *SQLiteRepository) getProductsByID() map[int]*products.Product {
	rows, err := r.db.Query(`SELECT id, name, description, price FROM products;`)
	if err != nil {
		return map[int]*products.Product{}
	}
	m := make(map[int]*products.Product)
	for _, row := range rows {
		id := db.IntFrom(row, "id")
		m[id] = &products.Product{
			ID:          id,
			Name:        db.StringFrom(row, "name"),
			Description: db.StringFrom(row, "description"),
			Price:       db.FloatFrom(row, "price"),
		}
	}
	return m
}

func (r *SQLiteRepository) getCategoriesByID() map[int]*CategoryView {
	rows, err := r.db.Query(`SELECT id, name, parent_id FROM categories;`)
	if err != nil {
		return map[int]*CategoryView{}
	}
	m := make(map[int]*CategoryView)
	for _, row := range rows {
		id := db.IntFrom(row, "id")
		m[id] = &CategoryView{ID: id, Name: db.StringFrom(row, "name"), ParentID: db.NullableIntFrom(row, "parent_id")}
	}
	return m
}

func (r *SQLiteRepository) getCollectionsByID() map[int]*collections.Collection {
	rows, err := r.db.Query(`SELECT id, name, parent_id FROM collections;`)
	if err != nil {
		return map[int]*collections.Collection{}
	}
	m := make(map[int]*collections.Collection)
	for _, row := range rows {
		id := db.IntFrom(row, "id")
		m[id] = &collections.Collection{ID: id, Name: db.StringFrom(row, "name"), ParentID: db.NullableIntFrom(row, "parent_id"), ProductIDs: []int{}}
	}

	linkRows, err := r.db.Query(`SELECT collection_id, product_id FROM collection_products;`)
	if err != nil {
		return m
	}
	for _, row := range linkRows {
		cid := db.IntFrom(row, "collection_id")
		pid := db.IntFrom(row, "product_id")
		if c, ok := m[cid]; ok {
			c.ProductIDs = append(c.ProductIDs, pid)
		}
	}
	return m
}

func (r *SQLiteRepository) getProductCategoryMap() map[int][]int {
	rows, err := r.db.Query(`SELECT product_id, category_id FROM product_categories;`)
	if err != nil {
		return map[int][]int{}
	}
	m := make(map[int][]int)
	for _, row := range rows {
		pid := db.IntFrom(row, "product_id")
		cid := db.IntFrom(row, "category_id")
		m[pid] = append(m[pid], cid)
	}
	return m
}

func getDescendantCollectionIDs(items map[int]*collections.Collection, parentID int) []int {
	result := make([]int, 0)
	for id, c := range items {
		if c.ParentID != nil && *c.ParentID == parentID {
			result = append(result, id)
			result = append(result, getDescendantCollectionIDs(items, id)...)
		}
	}
	return result
}

func getDescendantCategoryIDs(items map[int]*CategoryView, parentID int) []int {
	result := make([]int, 0)
	for id, c := range items {
		if c.ParentID != nil && *c.ParentID == parentID {
			result = append(result, id)
			result = append(result, getDescendantCategoryIDs(items, id)...)
		}
	}
	return result
}
