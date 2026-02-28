package handlers

import (
	"errors"
	"net/http"

	"categories-test/internal/application/commands"
	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
)

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.queries.ListCategories())
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var category entity.Category
	if err := h.readJSON(r, &category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.commands.CreateCategory(&category)
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

	var category entity.Category
	if err := h.readJSON(r, &category); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	category.ID = id
	updated, err := h.commands.UpdateCategory(&category)
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

	if err := h.commands.DeleteCategory(id); err != nil {
		if commands.IsCategoryInUse(err) {
			http.Error(w, "Category is in use by products", http.StatusConflict)
			return
		}
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Category not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist category", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
