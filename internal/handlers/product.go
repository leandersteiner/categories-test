package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"categories-test/internal/application/commands"
	"categories-test/internal/application/queries"
	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
)

type Handler struct {
	commands *commands.Service
	queries  *queries.Service
}

func New(commandService *commands.Service, queryService *queries.Service) *Handler {
	return &Handler{
		commands: commandService,
		queries:  queryService,
	}
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
	h.writeJSON(w, h.queries.ListProducts())
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var product entity.Product
	if err := h.readJSON(r, &product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.commands.CreateProduct(&product)
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

	var product entity.Product
	if err := h.readJSON(r, &product); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	product.ID = id
	updated, err := h.commands.UpdateProduct(&product)
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

	if err := h.commands.DeleteProduct(id); err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Product not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist product", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func isNotFound(err error) bool {
	return errors.Is(err, domainerrors.ErrNotFound)
}
