package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Models
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

// In-memory storage
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

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// Product handlers
func getProducts(w http.ResponseWriter, r *http.Request) {
	products := make([]*Product, 0, len(store.Products))
	for _, p := range store.Products {
		products = append(products, p)
	}
	json.NewEncoder(w).Encode(products)
}

func createProduct(w http.ResponseWriter, r *http.Request) {
	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	product.ID = store.nextID["product"]
	store.nextID["product"]++
	if product.CategoryIDs == nil {
		product.CategoryIDs = []int{}
	}
	store.Products[product.ID] = &product
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(product)
}

func updateProduct(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	prodID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	product.ID = prodID
	if product.CategoryIDs == nil {
		product.CategoryIDs = []int{}
	}
	store.Products[product.ID] = &product
	json.NewEncoder(w).Encode(product)
}

func deleteProduct(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	prodID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid product ID", http.StatusBadRequest)
		return
	}

	if _, exists := store.Products[prodID]; !exists {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	delete(store.Products, prodID)
	w.WriteHeader(http.StatusNoContent)
}

// Category handlers
func getCategories(w http.ResponseWriter, r *http.Request) {
	categories := make([]*Category, 0, len(store.Categories))
	for _, c := range store.Categories {
		categories = append(categories, c)
	}
	json.NewEncoder(w).Encode(categories)
}

func createCategory(w http.ResponseWriter, r *http.Request) {
	var category Category
	if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	category.ID = store.nextID["category"]
	store.nextID["category"]++
	store.Categories[category.ID] = &category
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(category)
}

func updateCategory(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	catID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	var category Category
	if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	category.ID = catID
	store.Categories[category.ID] = &category
	json.NewEncoder(w).Encode(category)
}

func deleteCategory(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	catID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid category ID", http.StatusBadRequest)
		return
	}

	if _, exists := store.Categories[catID]; !exists {
		http.Error(w, "Category not found", http.StatusNotFound)
		return
	}

	delete(store.Categories, catID)
	w.WriteHeader(http.StatusNoContent)
}

// Collection handlers
func getCollections(w http.ResponseWriter, r *http.Request) {
	collections := make([]*Collection, 0, len(store.Collections))
	for _, c := range store.Collections {
		collections = append(collections, c)
	}
	json.NewEncoder(w).Encode(collections)
}

func createCollection(w http.ResponseWriter, r *http.Request) {
	var collection Collection
	if err := json.NewDecoder(r.Body).Decode(&collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	collection.ID = store.nextID["collection"]
	store.nextID["collection"]++
	if collection.ProductIDs == nil {
		collection.ProductIDs = []int{}
	}
	store.Collections[collection.ID] = &collection
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(collection)
}

func updateCollection(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	collID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid collection ID", http.StatusBadRequest)
		return
	}

	var collection Collection
	if err := json.NewDecoder(r.Body).Decode(&collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	collection.ID = collID
	if collection.ProductIDs == nil {
		collection.ProductIDs = []int{}
	}
	store.Collections[collection.ID] = &collection
	json.NewEncoder(w).Encode(collection)
}

func deleteCollection(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	collID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid collection ID", http.StatusBadRequest)
		return
	}

	if _, exists := store.Collections[collID]; !exists {
		http.Error(w, "Collection not found", http.StatusNotFound)
		return
	}

	delete(store.Collections, collID)
	w.WriteHeader(http.StatusNoContent)
}

// Shop handlers
func getShops(w http.ResponseWriter, r *http.Request) {
	shops := make([]*Shop, 0, len(store.Shops))
	for _, s := range store.Shops {
		shops = append(shops, s)
	}
	json.NewEncoder(w).Encode(shops)
}

func createShop(w http.ResponseWriter, r *http.Request) {
	var shop Shop
	if err := json.NewDecoder(r.Body).Decode(&shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	shop.ID = store.nextID["shop"]
	store.nextID["shop"]++
	if shop.CollectionIDs == nil {
		shop.CollectionIDs = []int{}
	}
	store.Shops[shop.ID] = &shop
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(shop)
}

func updateShop(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shopID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid shop ID", http.StatusBadRequest)
		return
	}

	var shop Shop
	if err := json.NewDecoder(r.Body).Decode(&shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	shop.ID = shopID
	if shop.CollectionIDs == nil {
		shop.CollectionIDs = []int{}
	}
	store.Shops[shop.ID] = &shop
	json.NewEncoder(w).Encode(shop)
}

func deleteShop(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shopID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid shop ID", http.StatusBadRequest)
		return
	}

	if _, exists := store.Shops[shopID]; !exists {
		http.Error(w, "Shop not found", http.StatusNotFound)
		return
	}

	delete(store.Shops, shopID)
	w.WriteHeader(http.StatusNoContent)
}

func getShop(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shopID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid shop ID", http.StatusBadRequest)
		return
	}

	shop, exists := store.Shops[shopID]
	if !exists {
		http.Error(w, "Shop not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(shop)
}

func getShopProducts(w http.ResponseWriter, r *http.Request) {

	// Extract shop ID from path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shopID, err := strconv.Atoi(pathParts[3])
	if err != nil {
		http.Error(w, "Invalid shop ID", http.StatusBadRequest)
		return
	}

	shop, exists := store.Shops[shopID]
	if !exists {
		http.Error(w, "Shop not found", http.StatusNotFound)
		return
	}

	// If shop has collections, return products from those collections
	if len(shop.CollectionIDs) > 0 {
		productMap := make(map[int]bool)
		for _, collID := range shop.CollectionIDs {
			if coll, exists := store.Collections[collID]; exists {
				for _, prodID := range coll.ProductIDs {
					productMap[prodID] = true
				}
			}
		}

		products := make([]*Product, 0)
		for prodID := range productMap {
			if prod, exists := store.Products[prodID]; exists {
				products = append(products, prod)
			}
		}
		json.NewEncoder(w).Encode(products)
		return
	}

	// Otherwise return all products
	products := make([]*Product, 0, len(store.Products))
	for _, p := range store.Products {
		products = append(products, p)
	}
	json.NewEncoder(w).Encode(products)
}

func main() {
	http.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "GET" {
			getProducts(w, r)
		} else if r.Method == "POST" {
			createProduct(w, r)
		}
	})

	http.HandleFunc("/api/products/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "PUT" {
			updateProduct(w, r)
		} else if r.Method == "DELETE" {
			deleteProduct(w, r)
		}
	})

	http.HandleFunc("/api/categories", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "GET" {
			getCategories(w, r)
		} else if r.Method == "POST" {
			createCategory(w, r)
		}
	})

	http.HandleFunc("/api/categories/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "PUT" {
			updateCategory(w, r)
		} else if r.Method == "DELETE" {
			deleteCategory(w, r)
		}
	})

	http.HandleFunc("/api/collections", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "GET" {
			getCollections(w, r)
		} else if r.Method == "POST" {
			createCollection(w, r)
		}
	})

	http.HandleFunc("/api/collections/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "PUT" {
			updateCollection(w, r)
		} else if r.Method == "DELETE" {
			deleteCollection(w, r)
		}
	})

	http.HandleFunc("/api/shops", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if r.Method == "GET" {
			getShops(w, r)
		} else if r.Method == "POST" {
			createShop(w, r)
		}
	})

	http.HandleFunc("/api/shops/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == "OPTIONS" {
			return
		}
		if strings.HasSuffix(r.URL.Path, "/products") {
			getShopProducts(w, r)
		} else if r.Method == "GET" {
			getShop(w, r)
		} else if r.Method == "PUT" {
			updateShop(w, r)
		} else if r.Method == "DELETE" {
			deleteShop(w, r)
		}
	})

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
