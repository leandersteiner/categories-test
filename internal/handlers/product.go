package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"categories-test/internal/models"
	"categories-test/internal/store"
)

type Handler struct {
	store *store.Store
}

func New(store *store.Store) *Handler {
	return &Handler{store: store}
}

func (h *Handler) readJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func (h *Handler) writeJSON(w http.ResponseWriter, v interface{}) {
	json.NewEncoder(w).Encode(v)
}

func (h *Handler) parseID(path string) (int, error) {
	parts := splitPath(path)
	if len(parts) < 3 {
		return 0, errors.New("invalid path")
	}
	return strconv.Atoi(parts[2])
}

func splitPath(path string) []string {
	if path == "" {
		return nil
	}
	if path[0] == '/' {
		path = path[1:]
	}
	parts := make([]string, 0)
	start := 0
	for i := 0; i < len(path); i++ {
		if path[i] == '/' {
			if start < i {
				parts = append(parts, path[start:i])
			}
			start = i + 1
		}
	}
	if start < len(path) {
		parts = append(parts, path[start:])
	}
	return parts
}

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.store.GetProducts())
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var product models.Product
	if err := h.readJSON(r, &product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.store.CreateProduct(&product)
	if err != nil {
		http.Error(w, "Failed to persist product", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	h.writeJSON(w, created)
}

func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var product models.Product
	if err := h.readJSON(r, &product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	product.ID = id
	updated, err := h.store.UpdateProduct(&product)
	if err != nil {
		http.Error(w, "Failed to persist product", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, updated)
}

func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteProduct(id); err != nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
