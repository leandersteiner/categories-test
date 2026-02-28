package handlers

import (
	"net/http"
	"strings"

	"categories-test/internal/models"
)

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.store.GetCategories())
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var category models.Category
	if err := h.readJSON(r, &category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.store.CreateCategory(&category)
	if err != nil {
		http.Error(w, "Failed to persist category", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	h.writeJSON(w, created)
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var category models.Category
	if err := h.readJSON(r, &category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	category.ID = id
	updated, err := h.store.UpdateCategory(&category)
	if err != nil {
		http.Error(w, "Failed to persist category", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, updated)
}

func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteCategory(id); err != nil {
		if strings.Contains(err.Error(), "is in use by products") {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, "Category not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
