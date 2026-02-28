package collections

import (
	"errors"
	"net/http"

	"categories-test/internal/domain/entity"
	domainerrors "categories-test/internal/domain/errors"
	"categories-test/internal/platform/httpx"
)

type HTTPHandler struct {
	commands *Commands
	queries  *Queries
}

func NewHTTPHandler(commands *Commands, queries *Queries) *HTTPHandler {
	return &HTTPHandler{commands: commands, queries: queries}
}

type collectionDTO struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	ParentID   *int   `json:"parentId"`
	ProductIDs []int  `json:"productIds"`
}

func toCollectionDTO(c *entity.Collection) collectionDTO {
	return collectionDTO{ID: c.ID, Name: c.Name, ParentID: c.ParentID, ProductIDs: c.ProductIDs}
}

func fromCollectionDTO(dto collectionDTO) entity.Collection {
	return entity.Collection{ID: dto.ID, Name: dto.Name, ParentID: dto.ParentID, ProductIDs: dto.ProductIDs}
}

func (h *HTTPHandler) List(w http.ResponseWriter, r *http.Request) {
	collections := h.queries.List()
	response := make([]collectionDTO, 0, len(collections))
	for _, collection := range collections {
		response = append(response, toCollectionDTO(collection))
	}
	httpx.WriteJSON(w, response)
}

func (h *HTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload collectionDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	collection := fromCollectionDTO(payload)
	created, err := h.commands.Create(&collection)
	if err != nil {
		http.Error(w, "Failed to persist collection", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	httpx.WriteJSON(w, toCollectionDTO(created))
}

func (h *HTTPHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var payload collectionDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	collection := fromCollectionDTO(payload)
	collection.ID = id
	updated, err := h.commands.Update(&collection)
	if err != nil {
		http.Error(w, "Failed to persist collection", http.StatusInternalServerError)
		return
	}

	httpx.WriteJSON(w, toCollectionDTO(updated))
}

func (h *HTTPHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.commands.Delete(id); err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Collection not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist collection", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
