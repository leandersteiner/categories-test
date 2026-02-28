package handlers

import (
	"errors"
	"net/http"

	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
)

func (h *Handler) ListCollections(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.queries.ListCollections())
}

func (h *Handler) CreateCollection(w http.ResponseWriter, r *http.Request) {
	var collection entity.Collection
	if err := h.readJSON(r, &collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.commands.CreateCollection(&collection)
	if err != nil {
		http.Error(w, "Failed to persist collection", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	h.writeJSON(w, created)
}

func (h *Handler) UpdateCollection(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var collection entity.Collection
	if err := h.readJSON(r, &collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	collection.ID = id
	updated, err := h.commands.UpdateCollection(&collection)
	if err != nil {
		http.Error(w, "Failed to persist collection", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, updated)
}

func (h *Handler) DeleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.commands.DeleteCollection(id); err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Collection not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist collection", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
