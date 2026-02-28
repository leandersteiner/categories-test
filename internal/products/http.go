package products

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

type productDTO struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	CategoryIDs []int   `json:"categoryIds"`
}

func ensureIntSlice(value []int) []int {
	if value == nil {
		return []int{}
	}
	return value
}

func toProductDTO(p *Product) productDTO {
	return productDTO{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Price:       p.Price,
		CategoryIDs: ensureIntSlice(p.CategoryIDs),
	}
}

func fromProductDTO(dto productDTO) Product {
	return Product{
		ID:          dto.ID,
		Name:        dto.Name,
		Description: dto.Description,
		Price:       dto.Price,
		CategoryIDs: ensureIntSlice(dto.CategoryIDs),
	}
}

func (h *HTTPHandler) List(w http.ResponseWriter, r *http.Request) {
	products := h.queries.List()
	response := make([]productDTO, 0, len(products))
	for _, product := range products {
		response = append(response, toProductDTO(product))
	}
	httpx.WriteJSON(w, response)
}

func (h *HTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload productDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	product := fromProductDTO(payload)
	created, err := h.commands.Create(&product)
	if err != nil {
		http.Error(w, "Failed to persist product", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	httpx.WriteJSON(w, toProductDTO(created))
}

func (h *HTTPHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var payload productDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	product := fromProductDTO(payload)
	product.ID = id
	updated, err := h.commands.Update(&product)
	if err != nil {
		http.Error(w, "Failed to persist product", http.StatusInternalServerError)
		return
	}

	httpx.WriteJSON(w, toProductDTO(updated))
}

func (h *HTTPHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.commands.Delete(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			http.Error(w, "Product not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist product", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
