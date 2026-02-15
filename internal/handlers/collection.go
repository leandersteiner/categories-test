package handlers

import (
	"net/http"

	"categories-test/internal/models"
)

func (h *Handler) ListCollections(w http.ResponseWriter, r *http.Request) {
	h.writeJSON(w, h.store.GetCollections())
}

func (h *Handler) CreateCollection(w http.ResponseWriter, r *http.Request) {
	var collection models.Collection
	if err := h.readJSON(r, &collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created := h.store.CreateCollection(&collection)
	w.WriteHeader(http.StatusCreated)
	h.writeJSON(w, created)
}

func (h *Handler) UpdateCollection(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var collection models.Collection
	if err := h.readJSON(r, &collection); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	collection.ID = id
	h.writeJSON(w, h.store.UpdateCollection(&collection))
}

func (h *Handler) DeleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteCollection(id); err != nil {
		http.Error(w, "Collection not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
