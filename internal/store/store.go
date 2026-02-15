package store

import (
	"errors"
	"sync"

	"categories-test/internal/models"
)

var (
	ErrNotFound = errors.New("not found")
)

type Store struct {
	mu          sync.RWMutex
	Products    map[int]*models.Product
	Categories  map[int]*models.Category
	Collections map[int]*models.Collection
	Shops       map[int]*models.Shop
	nextID      map[string]int
}

func New() *Store {
	s := &Store{
		Products:    make(map[int]*models.Product),
		Categories:  make(map[int]*models.Category),
		Collections: make(map[int]*models.Collection),
		Shops:       make(map[int]*models.Shop),
		nextID:      map[string]int{"product": 1, "category": 1, "collection": 1, "shop": 1},
	}
	s.seed()
	return s
}

func (s *Store) seed() {
	s.Categories[1] = &models.Category{ID: 1, Name: "category1", ParentID: nil}
	s.Categories[2] = &models.Category{ID: 2, Name: "category2", ParentID: nil}
	s.nextID["category"] = 3

	s.Products[1] = &models.Product{ID: 1, Name: "product1", Description: "prod1", Price: 20, CategoryIDs: []int{1}}
	s.Products[2] = &models.Product{ID: 2, Name: "product2", Description: "prod2", Price: 25, CategoryIDs: []int{1}}
	s.Products[3] = &models.Product{ID: 3, Name: "product3", Description: "prod3", Price: 30, CategoryIDs: []int{2}}
	s.nextID["product"] = 4

	parent1 := 1
	s.Collections[1] = &models.Collection{ID: 1, Name: "collection1", ParentID: nil, ProductIDs: []int{1, 3}}
	s.Collections[2] = &models.Collection{ID: 2, Name: "collection2", ParentID: &parent1, ProductIDs: []int{2}}
	s.Collections[3] = &models.Collection{ID: 3, Name: "collection3", ParentID: nil, ProductIDs: []int{1, 2, 3}}
	s.nextID["collection"] = 4

	s.Shops[1] = &models.Shop{ID: 1, Name: "shop1", CollectionIDs: []int{1, 2, 3}}
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

func (s *Store) GetProducts() []*models.Product {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Products)
}

func (s *Store) CreateProduct(p *models.Product) *models.Product {
	s.mu.Lock()
	defer s.mu.Unlock()
	p.ID = s.generateID("product")
	p.CategoryIDs = ensureSlice(p.CategoryIDs)
	s.Products[p.ID] = p
	return p
}

func (s *Store) UpdateProduct(p *models.Product) *models.Product {
	s.mu.Lock()
	defer s.mu.Unlock()
	p.CategoryIDs = ensureSlice(p.CategoryIDs)
	s.Products[p.ID] = p
	return p
}

func (s *Store) DeleteProduct(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Products[id]; !ok {
		return ErrNotFound
	}
	delete(s.Products, id)
	return nil
}

func (s *Store) GetCategories() []*models.Category {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Categories)
}

func (s *Store) CreateCategory(c *models.Category) *models.Category {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ID = s.generateID("category")
	s.Categories[c.ID] = c
	return c
}

func (s *Store) UpdateCategory(c *models.Category) *models.Category {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Categories[c.ID] = c
	return c
}

func (s *Store) DeleteCategory(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Categories[id]; !ok {
		return ErrNotFound
	}

	descendantIDs := s.getDescendantIDs(id)
	allIDs := append([]int{id}, descendantIDs...)

	for _, p := range s.Products {
		for _, catID := range p.CategoryIDs {
			for _, toDelete := range allIDs {
				if catID == toDelete {
					if catID == id {
						return errors.New("this category is in use by products")
					}
					catName := s.Categories[catID].Name
					return errors.New("child category '" + catName + "' is in use by products")
				}
			}
		}
	}

	for _, toDelete := range allIDs {
		delete(s.Categories, toDelete)
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

func (s *Store) GetCollections() []*models.Collection {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Collections)
}

func (s *Store) CreateCollection(c *models.Collection) *models.Collection {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ID = s.generateID("collection")
	c.ProductIDs = ensureSlice(c.ProductIDs)
	s.Collections[c.ID] = c
	return c
}

func (s *Store) UpdateCollection(c *models.Collection) *models.Collection {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ProductIDs = ensureSlice(c.ProductIDs)
	s.Collections[c.ID] = c
	return c
}

func (s *Store) DeleteCollection(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Collections[id]; !ok {
		return ErrNotFound
	}
	delete(s.Collections, id)
	return nil
}

func (s *Store) GetShops() []*models.Shop {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return mapToSlice(s.Shops)
}

func (s *Store) GetShop(id int) (*models.Shop, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if shop, ok := s.Shops[id]; ok {
		return shop, nil
	}
	return nil, ErrNotFound
}

func (s *Store) CreateShop(shop *models.Shop) *models.Shop {
	s.mu.Lock()
	defer s.mu.Unlock()
	shop.ID = s.generateID("shop")
	shop.CollectionIDs = ensureSlice(shop.CollectionIDs)
	s.Shops[shop.ID] = shop
	return shop
}

func (s *Store) UpdateShop(shop *models.Shop) *models.Shop {
	s.mu.Lock()
	defer s.mu.Unlock()
	shop.CollectionIDs = ensureSlice(shop.CollectionIDs)
	s.Shops[shop.ID] = shop
	return shop
}

func (s *Store) DeleteShop(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.Shops[id]; !ok {
		return ErrNotFound
	}
	delete(s.Shops, id)
	return nil
}

func (s *Store) GetShopProducts(shopID int) []*models.Product {
	s.mu.RLock()
	shop, ok := s.Shops[shopID]
	if !ok || len(shop.CollectionIDs) == 0 {
		s.mu.RUnlock()
		return mapToSlice(s.Products)
	}

	productMap := make(map[int]bool)
	for _, collID := range shop.CollectionIDs {
		if coll, ok := s.Collections[collID]; ok {
			for _, prodID := range coll.ProductIDs {
				productMap[prodID] = true
			}
		}
	}
	s.mu.RUnlock()

	products := make([]*models.Product, 0, len(productMap))
	s.mu.RLock()
	for prodID := range productMap {
		if prod, exists := s.Products[prodID]; exists {
			products = append(products, prod)
		}
	}
	s.mu.RUnlock()
	return products
}
