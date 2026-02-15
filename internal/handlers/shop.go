package handlers

import (
	"net/http"
	"strings"

	"categories-test/internal/models"
)

func (h *Handler) ListShops(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.store.GetShops())
}

func (h *Handler) GetShop(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shop, err := h.store.GetShop(id)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusNotFound)
		return
	}

	h.writeJSON(w, shop)
}

func (h *Handler) CreateShop(w http.ResponseWriter, r *http.Request) {
	var shop models.Shop
	if err := h.readJSON(r, &shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created := h.store.CreateShop(&shop)
	w.WriteHeader(http.StatusCreated)
	h.writeJSON(w, created)
}

func (h *Handler) UpdateShop(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var shop models.Shop
	if err := h.readJSON(r, &shop); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	shop.ID = id
	h.writeJSON(w, h.store.UpdateShop(&shop))
}

func (h *Handler) DeleteShop(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteShop(id); err != nil {
		http.Error(w, "Shop not found", http.StatusNotFound)
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

	h.writeJSON(w, h.store.GetShopProducts(id))
}
