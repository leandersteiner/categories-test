package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

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

type Store struct {
	Products    map[int]*Product
	Categories  map[int]*Category
	Collections map[int]*Collection
	Shops       map[int]*Shop
	nextID      map[string]int
}

func NewStore() *Store {
	return &Store{
		Products:    make(map[int]*Product),
		Categories:  make(map[int]*Category),
		Collections: make(map[int]*Collection),
		Shops:       make(map[int]*Shop),
		nextID:      map[string]int{"product": 1, "category": 1, "collection": 1, "shop": 1},
	}
}

var store = NewStore()

func init() {
	store.Categories[1] = &Category{ID: 1, Name: "category1", ParentID: nil}
	store.Categories[2] = &Category{ID: 2, Name: "category2", ParentID: nil}
	store.nextID["category"] = 3

	store.Products[1] = &Product{ID: 1, Name: "product1", Description: "prod1", Price: 20, CategoryIDs: []int{1}}
	store.Products[2] = &Product{ID: 2, Name: "product2", Description: "prod2", Price: 25, CategoryIDs: []int{1}}
	store.Products[3] = &Product{ID: 3, Name: "product3", Description: "prod3", Price: 30, CategoryIDs: []int{2}}
	store.nextID["product"] = 4

	parent1 := 1
	store.Collections[1] = &Collection{ID: 1, Name: "collection1", ParentID: nil, ProductIDs: []int{1, 3}}
	store.Collections[2] = &Collection{ID: 2, Name: "collection2", ParentID: &parent1, ProductIDs: []int{2}}
	store.Collections[3] = &Collection{ID: 3, Name: "collection3", ParentID: nil, ProductIDs: []int{1, 2, 3}}
	store.nextID["collection"] = 4

	store.Shops[1] = &Shop{ID: 1, Name: "shop1", CollectionIDs: []int{1, 2, 3}}
	store.nextID["shop"] = 2
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
}

func parseID(path string) (int, error) {
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		return 0, http.ErrNoCookie
	}
	return strconv.Atoi(parts[3])
}

func readJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	json.NewEncoder(w).Encode(v)
}

func mapToSlice[T any](m map[int]*T) []*T {
	result := make([]*T, 0, len(m))
	for _, v := range m {
		result = append(result, v)
	}
	return result
}

func generateID(entityType string) int {
	id := store.nextID[entityType]
	store.nextID[entityType]++
	return id
}

func ensureSlice[T any](slice []T) []T {
	if slice == nil {
		return []T{}
	}
	return slice
}

func (s *Store) getProducts() []*Product {
	return mapToSlice(s.Products)
}

func (s *Store) createProduct(p *Product) *Product {
	p.ID = generateID("product")
	p.CategoryIDs = ensureSlice(p.CategoryIDs)
	s.Products[p.ID] = p
	return p
}

func (s *Store) updateProduct(p *Product) *Product {
	p.CategoryIDs = ensureSlice(p.CategoryIDs)
	s.Products[p.ID] = p
	return p
}

func (s *Store) getCategories() []*Category {
	return mapToSlice(s.Categories)
}

func (s *Store) createCategory(c *Category) *Category {
	c.ID = generateID("category")
	s.Categories[c.ID] = c
	return c
}

func (s *Store) updateCategory(c *Category) *Category {
	s.Categories[c.ID] = c
	return c
}

func (s *Store) deleteCategory(id int) error {
	if _, ok := s.Categories[id]; !ok {
		return http.ErrNoCookie
	}
	delete(s.Categories, id)
	return nil
}

func (s *Store) getCollections() []*Collection {
	return mapToSlice(s.Collections)
}

func (s *Store) createCollection(c *Collection) *Collection {
	c.ID = generateID("collection")
	c.ProductIDs = ensureSlice(c.ProductIDs)
	s.Collections[c.ID] = c
	return c
}

func (s *Store) updateCollection(c *Collection) *Collection {
	c.ProductIDs = ensureSlice(c.ProductIDs)
	s.Collections[c.ID] = c
	return c
}

func (s *Store) deleteCollection(id int) error {
	if _, ok := s.Collections[id]; !ok {
		return http.ErrNoCookie
	}
	delete(s.Collections, id)
	return nil
}

func (s *Store) getShops() []*Shop {
	return mapToSlice(s.Shops)
}

func (s *Store) getShop(id int) (*Shop, error) {
	if shop, ok := s.Shops[id]; ok {
		return shop, nil
	}
	return nil, http.ErrNoCookie
}

func (s *Store) createShop(shop *Shop) *Shop {
	shop.ID = generateID("shop")
	shop.CollectionIDs = ensureSlice(shop.CollectionIDs)
	s.Shops[shop.ID] = shop
	return shop
}

func (s *Store) updateShop(shop *Shop) *Shop {
	shop.CollectionIDs = ensureSlice(shop.CollectionIDs)
	s.Shops[shop.ID] = shop
	return shop
}

func (s *Store) deleteShop(id int) error {
	if _, ok := s.Shops[id]; !ok {
		return http.ErrNoCookie
	}
	delete(s.Shops, id)
	return nil
}

func (s *Store) getShopProducts(shopID int) []*Product {
	shop, err := s.getShop(shopID)
	if err != nil || len(shop.CollectionIDs) == 0 {
		return s.getProducts()
	}

	productMap := make(map[int]bool)
	for _, collID := range shop.CollectionIDs {
		if coll, ok := s.Collections[collID]; ok {
			for _, prodID := range coll.ProductIDs {
				productMap[prodID] = true
			}
		}
	}

	products := make([]*Product, 0, len(productMap))
	for prodID := range productMap {
		if prod, exists := s.Products[prodID]; exists {
			products = append(products, prod)
		}
	}
	return products
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, store.getProducts())
}

func createProduct(w http.ResponseWriter, r *http.Request) {
	var product Product
	if err := readJSON(r, &product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created := store.createProduct(&product)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

func updateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var product Product
	if err := readJSON(r, &product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	product.ID = id
	writeJSON(w, store.updateProduct(&product))
}

func deleteProduct(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if _, ok := store.Products[id]; !ok {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	delete(store.Products, id)
	w.WriteHeader(http.StatusNoContent)
}

func getCategories(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, store.getCategories())
}

func createCategory(w http.ResponseWriter, r *http.Request) {
	var category Category
	if err := readJSON(r, &category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created := store.createCategory(&category)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

func updateCategory(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var category Category
	if err := readJSON(r, &category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	category.ID = id
	writeJSON(w, store.updateCategory(&category))
}

func deleteCategory(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := store.deleteCategory(id); err != nil {
		http.Error(w, "Category not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func getCollections(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, store.getCollections())
}

func createCollection(w http.ResponseWriter, r *http.Request) {
	var collection Collection
	if err := readJSON(r, &collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created := store.createCollection(&collection)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

func updateCollection(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var collection Collection
	if err := readJSON(r, &collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	collection.ID = id
	writeJSON(w, store.updateCollection(&collection))
}

func deleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := store.deleteCollection(id); err != nil {
		http.Error(w, "Collection not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func getShops(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, store.getShops())
}

func getShop(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shop, err := store.getShop(id)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusNotFound)
		return
	}

	writeJSON(w, shop)
}

func createShop(w http.ResponseWriter, r *http.Request) {
	var shop Shop
	if err := readJSON(r, &shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created := store.createShop(&shop)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

func updateShop(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var shop Shop
	if err := readJSON(r, &shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	shop.ID = id
	writeJSON(w, store.updateShop(&shop))
}

func deleteShop(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := store.deleteShop(id); err != nil {
		http.Error(w, "Shop not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func getShopProducts(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	writeJSON(w, store.getShopProducts(id))
}

func handleProducts(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "GET":
		getProducts(w, r)
	case "POST":
		createProduct(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleProductByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "PUT":
		updateProduct(w, r)
	case "DELETE":
		deleteProduct(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCategories(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "GET":
		getCategories(w, r)
	case "POST":
		createCategory(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCategoryByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "PUT":
		updateCategory(w, r)
	case "DELETE":
		deleteCategory(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCollections(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "GET":
		getCollections(w, r)
	case "POST":
		createCollection(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCollectionByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "PUT":
		updateCollection(w, r)
	case "DELETE":
		deleteCollection(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleShops(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	switch r.Method {
	case "GET":
		getShops(w, r)
	case "POST":
		createShop(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleShopByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	if strings.HasSuffix(r.URL.Path, "/products") {
		switch r.Method {
		case "GET":
			getShopProducts(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	switch r.Method {
	case "GET":
		getShop(w, r)
	case "PUT":
		updateShop(w, r)
	case "DELETE":
		deleteShop(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func main() {
	http.HandleFunc("/api/products", handleProducts)
	http.HandleFunc("/api/products/", handleProductByID)
	http.HandleFunc("/api/categories", handleCategories)
	http.HandleFunc("/api/categories/", handleCategoryByID)
	http.HandleFunc("/api/collections", handleCollections)
	http.HandleFunc("/api/collections/", handleCollectionByID)
	http.HandleFunc("/api/shops", handleShops)
	http.HandleFunc("/api/shops/", handleShopByID)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
