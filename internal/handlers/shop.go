package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
)

func (h *Handler) ListShops(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.queries.ListShops())
}

func (h *Handler) GetShop(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shop, err := h.queries.GetShop(id)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Shop not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to load shop", http.StatusInternalServerError)
		return
	}

	h.writeJSON(w, shop)
}

func (h *Handler) CreateShop(w http.ResponseWriter, r *http.Request) {
	var shop entity.Shop
	if err := h.readJSON(r, &shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.commands.CreateShop(&shop)
	if err != nil {
		http.Error(w, "Failed to persist shop", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	h.writeJSON(w, created)
}

func (h *Handler) UpdateShop(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var shop entity.Shop
	if err := h.readJSON(r, &shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	shop.ID = id
	updated, err := h.commands.UpdateShop(&shop)
	if err != nil {
		http.Error(w, "Failed to persist shop", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, updated)
}

func (h *Handler) DeleteShop(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.commands.DeleteShop(id); err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Shop not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist shop", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetShopProducts(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !strings.HasSuffix(r.URL.Path, "/products") {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	collectionID := r.URL.Query().Get("collection")
	categoryID := r.URL.Query().Get("category")
	page := 1
	limit := 10

	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	var collID *int
	if collectionID != "" {
		if parsed, err := strconv.Atoi(collectionID); err == nil {
			collID = &parsed
		}
	}

	var catID *int
	if categoryID != "" {
		if parsed, err := strconv.Atoi(categoryID); err == nil {
			catID = &parsed
		}
	}

	h.writeJSON(w, h.queries.GetShopProducts(id, collID, catID, page, limit))
}

func (h *Handler) GetShopCategories(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if !strings.HasSuffix(r.URL.Path, "/categories") {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	collectionID := r.URL.Query().Get("collection")
	directOnly := r.URL.Query().Get("direct") == "true"

	var collID *int
	if collectionID != "" {
		if parsed, err := strconv.Atoi(collectionID); err == nil {
			collID = &parsed
		}
	}

	h.writeJSON(w, h.queries.GetShopCategories(id, collID, directOnly))
}
