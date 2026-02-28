package store

import (
	"encoding/json"
	"os"
	"sort"
	"sync"

	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
)

const dataFile = "data.json"

type Store struct {
	mu          sync.RWMutex
	Products    map[int]*entity.Product
	Categories  map[int]*entity.Category
	Collections map[int]*entity.Collection
	Shops       map[int]*entity.Shop
	nextID      map[string]int
}

type storeData struct {
	Products    map[int]*entity.Product    `json:"products"`
	Categories  map[int]*entity.Category   `json:"categories"`
	Collections map[int]*entity.Collection `json:"collections"`
	Shops       map[int]*entity.Shop       `json:"shops"`
	NextID      map[string]int             `json:"nextId"`
}

func New() *Store {
	s := &Store{
		Products:    make(map[int]*entity.Product),
		Categories:  make(map[int]*entity.Category),
		Collections: make(map[int]*entity.Collection),
		Shops:       make(map[int]*entity.Shop),
		nextID:      map[string]int{"product": 1, "category": 1, "collection": 1, "shop": 1},
	}
	if err := s.load(); err == nil {
		return s
	}
	s.seed()
	s.save()
	return s
}

func (s *Store) load() error {
	data, err := os.ReadFile(dataFile)
	if err != nil {
		return err
	}
	var sd storeData
	if err := json.Unmarshal(data, &sd); err != nil {
		return err
	}
	s.Products = sd.Products
	s.Categories = sd.Categories
	s.Collections = sd.Collections
	s.Shops = sd.Shops
	s.nextID = sd.NextID
	return nil
}

func (s *Store) save() error {
	sd := storeData{
		Products:    s.Products,
		Categories:  s.Categories,
		Collections: s.Collections,
		Shops:       s.Shops,
		NextID:      s.nextID,
	}
	data, err := json.MarshalIndent(sd, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(dataFile, data, 0644)
}

func (s *Store) seed() {
	s.Categories[1] = &entity.Category{ID: 1, Name: "category1", ParentID: nil}
	s.Categories[2] = &entity.Category{ID: 2, Name: "category2", ParentID: nil}
	s.nextID["category"] = 3

	s.Products[1] = &entity.Product{ID: 1, Name: "product1", Description: "prod1", Price: 20, CategoryIDs: []int{1}}
	s.Products[2] = &entity.Product{ID: 2, Name: "product2", Description: "prod2", Price: 25, CategoryIDs: []int{1}}
	s.Products[3] = &entity.Product{ID: 3, Name: "product3", Description: "prod3", Price: 30, CategoryIDs: []int{2}}
	s.nextID["product"] = 4

	parent1 := 1
	s.Collections[1] = &entity.Collection{ID: 1, Name: "collection1", ParentID: nil, ProductIDs: []int{1, 3}}
	s.Collections[2] = &entity.Collection{ID: 2, Name: "collection2", ParentID: &parent1, ProductIDs: []int{2}}
	s.Collections[3] = &entity.Collection{ID: 3, Name: "collection3", ParentID: nil, ProductIDs: []int{1, 2, 3}}
	s.nextID["collection"] = 4

	s.Shops[1] = &entity.Shop{ID: 1, Name: "shop1", CollectionIDs: []int{1, 2, 3}}
	s.nextID["shop"] = 2
}

func (s *Store) generateID(entityType string) int {
	id := s.nextID[entityType]
	s.nextID[entityType]++
	return id
}

func ensureSlice[T any](slice []T) []T {
	if slice == nil {
		return []T{}
	}
	return slice
}

func mapToSlice[T any](m map[int]*T) []*T {
	result := make([]*T, 0, len(m))
	for _, v := range m {
		result = append(result, v)
	}
	return result
}

func (s *Store) GetProducts() []*entity.Product {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Products)
}

func (s *Store) CreateProduct(p *entity.Product) (*entity.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p.ID = s.generateID("product")
	p.CategoryIDs = ensureSlice(p.CategoryIDs)
	s.Products[p.ID] = p
	if err := s.save(); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) UpdateProduct(p *entity.Product) (*entity.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p.CategoryIDs = ensureSlice(p.CategoryIDs)
	s.Products[p.ID] = p
	if err := s.save(); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) DeleteProduct(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Products[id]; !ok {
		return domainerrors.ErrNotFound
	}
	delete(s.Products, id)
	if err := s.save(); err != nil {
		return err
	}
	return nil
}

func (s *Store) GetCategories() []*entity.Category {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Categories)
}

func (s *Store) CreateCategory(c *entity.Category) (*entity.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ID = s.generateID("category")
	s.Categories[c.ID] = c
	if err := s.save(); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Store) UpdateCategory(c *entity.Category) (*entity.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Categories[c.ID] = c
	if err := s.save(); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Store) DeleteCategory(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Categories[id]; !ok {
		return domainerrors.ErrNotFound
	}

	descendantIDs := s.getDescendantIDs(id)
	allIDs := append([]int{id}, descendantIDs...)

	for _, p := range s.Products {
		for _, catID := range p.CategoryIDs {
			for _, toDelete := range allIDs {
				if catID == toDelete {
					if catID == id {
						return domainerrors.ErrCategoryInUse
					}
					return domainerrors.ErrChildCategoryInUse
				}
			}
		}
	}

	for _, toDelete := range allIDs {
		delete(s.Categories, toDelete)
	}
	if err := s.save(); err != nil {
		return err
	}
	return nil
}

func (s *Store) getDescendantIDs(parentID int) []int {
	var descendants []int
	for _, c := range s.Categories {
		if c.ParentID != nil && *c.ParentID == parentID {
			descendants = append(descendants, c.ID)
			descendants = append(descendants, s.getDescendantIDs(c.ID)...)
		}
	}
	return descendants
}

func (s *Store) GetCollections() []*entity.Collection {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Collections)
}

func (s *Store) CreateCollection(c *entity.Collection) (*entity.Collection, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ID = s.generateID("collection")
	c.ProductIDs = ensureSlice(c.ProductIDs)
	s.Collections[c.ID] = c
	if err := s.save(); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Store) UpdateCollection(c *entity.Collection) (*entity.Collection, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ProductIDs = ensureSlice(c.ProductIDs)
	s.Collections[c.ID] = c
	if err := s.save(); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Store) DeleteCollection(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Collections[id]; !ok {
		return domainerrors.ErrNotFound
	}
	delete(s.Collections, id)
	if err := s.save(); err != nil {
		return err
	}
	return nil
}

func (s *Store) GetShops() []*entity.Shop {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Shops)
}

func (s *Store) GetShop(id int) (*entity.Shop, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if shop, ok := s.Shops[id]; ok {
		return shop, nil
	}
	return nil, domainerrors.ErrNotFound
}

func (s *Store) CreateShop(shop *entity.Shop) (*entity.Shop, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	shop.ID = s.generateID("shop")
	shop.CollectionIDs = ensureSlice(shop.CollectionIDs)
	s.Shops[shop.ID] = shop
	if err := s.save(); err != nil {
		return nil, err
	}
	return shop, nil
}

func (s *Store) UpdateShop(shop *entity.Shop) (*entity.Shop, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	shop.CollectionIDs = ensureSlice(shop.CollectionIDs)
	s.Shops[shop.ID] = shop
	if err := s.save(); err != nil {
		return nil, err
	}
	return shop, nil
}

func (s *Store) DeleteShop(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Shops[id]; !ok {
		return domainerrors.ErrNotFound
	}
	delete(s.Shops, id)
	if err := s.save(); err != nil {
		return err
	}
	return nil
}

func (s *Store) GetShopProducts(shopID int, collectionID *int, categoryID *int, page, limit int) *entity.PaginatedProducts {
	s.mu.RLock()
	defer s.mu.RUnlock()

	shop, ok := s.Shops[shopID]
	if !ok {
		return &entity.PaginatedProducts{
			Products:   []*entity.Product{},
			Page:       page,
			Limit:      limit,
			TotalCount: 0,
			TotalPages: 0,
		}
	}

	productMap := make(map[int]bool)

	if collectionID != nil {
		collIDs := []int{*collectionID}
		collIDs = append(collIDs, s.getDescendantCollectionIDs(*collectionID)...)
		for _, cid := range collIDs {
			if coll, ok := s.Collections[cid]; ok {
				for _, prodID := range coll.ProductIDs {
					productMap[prodID] = true
				}
			}
		}
	} else if len(shop.CollectionIDs) > 0 {
		for _, collID := range shop.CollectionIDs {
			if coll, ok := s.Collections[collID]; ok {
				for _, prodID := range coll.ProductIDs {
					productMap[prodID] = true
				}
			}
		}
	} else {
		for prodID := range s.Products {
			productMap[prodID] = true
		}
	}

	if categoryID != nil {
		catIDs := s.getDescendantCategoryIDs(*categoryID)
		catIDs = append(catIDs, *categoryID)
		filteredMap := make(map[int]bool)
		for prodID := range productMap {
			if prod, exists := s.Products[prodID]; exists {
				for _, cID := range prod.CategoryIDs {
					if contains(catIDs, cID) {
						filteredMap[prodID] = true
						break
					}
				}
			}
		}
		productMap = filteredMap
	}

	products := make([]*entity.Product, 0, len(productMap))
	for prodID := range productMap {
		if prod, exists := s.Products[prodID]; exists {
			products = append(products, prod)
		}
	}

	sort.Slice(products, func(i, j int) bool {
		return products[i].ID < products[j].ID
	})

	totalCount := len(products)
	totalPages := (totalCount + limit - 1) / limit
	start := (page - 1) * limit
	end := start + limit
	if start > totalCount {
		start = totalCount
	}
	if end > totalCount {
		end = totalCount
	}

	pagedProducts := products
	if start < end {
		pagedProducts = products[start:end]
	} else {
		pagedProducts = []*entity.Product{}
	}

	return &entity.PaginatedProducts{
		Products:   pagedProducts,
		Page:       page,
		Limit:      limit,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}
}

func contains(slice []int, item int) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

func (s *Store) getDescendantCategoryIDs(parentID int) []int {
	var result []int
	for id, cat := range s.Categories {
		if cat.ParentID != nil && *cat.ParentID == parentID {
			result = append(result, id)
			result = append(result, s.getDescendantCategoryIDs(id)...)
		}
	}
	return result
}

func (s *Store) GetShopCategories(shopID int, collectionID *int, directOnly bool) []*entity.Category {
	s.mu.RLock()
	defer s.mu.RUnlock()

	shop, ok := s.Shops[shopID]
	if !ok {
		return nil
	}

	productMap := make(map[int]bool)

	if collectionID != nil {
		collIDs := []int{*collectionID}
		if !directOnly {
			collIDs = append(collIDs, s.getDescendantCollectionIDs(*collectionID)...)
		}
		for _, cid := range collIDs {
			if coll, ok := s.Collections[cid]; ok {
				for _, prodID := range coll.ProductIDs {
					productMap[prodID] = true
				}
			}
		}
	} else if len(shop.CollectionIDs) > 0 {
		for _, collID := range shop.CollectionIDs {
			if coll, ok := s.Collections[collID]; ok {
				for _, prodID := range coll.ProductIDs {
					productMap[prodID] = true
				}
			}
		}
	} else {
		for prodID := range s.Products {
			productMap[prodID] = true
		}
	}

	categoryMap := make(map[int]*entity.Category)
	for prodID := range productMap {
		if prod, ok := s.Products[prodID]; ok {
			for _, catID := range prod.CategoryIDs {
				if cat, ok := s.Categories[catID]; ok {
					categoryMap[catID] = cat
				}
			}
		}
	}

	result := make([]*entity.Category, 0, len(categoryMap))
	for _, cat := range categoryMap {
		result = append(result, cat)
	}
	return result
}

func (s *Store) getDescendantCollectionIDs(parentID int) []int {
	var result []int
	for id, coll := range s.Collections {
		if coll.ParentID != nil && *coll.ParentID == parentID {
			result = append(result, id)
			result = append(result, s.getDescendantCollectionIDs(id)...)
		}
	}
	return result
}
