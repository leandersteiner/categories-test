package categories

import (
	"errors"
	"net/http"

	"categories-test/internal/platform/httpx"
)

type HTTPHandler struct {
	commands *Commands
	queries  *Queries
}

func NewHTTPHandler(commands *Commands, queries *Queries) *HTTPHandler {
	return &HTTPHandler{commands: commands, queries: queries}
}

type categoryDTO struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	ParentID *int   `json:"parentId"`
}

func toCategoryDTO(c *Category) categoryDTO {
	return categoryDTO{ID: c.ID, Name: c.Name, ParentID: c.ParentID}
}

func fromCategoryDTO(dto categoryDTO) Category {
	return Category{ID: dto.ID, Name: dto.Name, ParentID: dto.ParentID}
}

func (h *HTTPHandler) List(w http.ResponseWriter, r *http.Request) {
	categories := h.queries.List()
	response := make([]categoryDTO, 0, len(categories))
	for _, category := range categories {
		response = append(response, toCategoryDTO(category))
	}
	httpx.WriteJSON(w, response)
}

func (h *HTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload categoryDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	category := fromCategoryDTO(payload)
	created, err := h.commands.Create(&category)
	if err != nil {
		http.Error(w, "Failed to persist category", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	httpx.WriteJSON(w, toCategoryDTO(created))
}

func (h *HTTPHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var payload categoryDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	category := fromCategoryDTO(payload)
	category.ID = id
	updated, err := h.commands.Update(&category)
	if err != nil {
		http.Error(w, "Failed to persist category", http.StatusInternalServerError)
		return
	}

	httpx.WriteJSON(w, toCategoryDTO(updated))
}

func (h *HTTPHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.commands.Delete(id); err != nil {
		if errors.Is(err, ErrCategoryInUse) || errors.Is(err, ErrChildInUse) {
			http.Error(w, "Category is in use by products", http.StatusConflict)
			return
		}
		if errors.Is(err, ErrNotFound) {
			http.Error(w, "Category not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist category", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
