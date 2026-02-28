package shops

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

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

type shopDTO struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	CollectionIDs []int  `json:"collectionIds"`
}

type productDTO struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	CategoryIDs []int   `json:"categoryIds"`
}

type categoryDTO struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	ParentID *int   `json:"parentId"`
}

type paginatedProductsDTO struct {
	Products   []productDTO `json:"products"`
	Page       int          `json:"page"`
	Limit      int          `json:"limit"`
	TotalCount int          `json:"totalCount"`
	TotalPages int          `json:"totalPages"`
}

func toShopDTO(s *entity.Shop) shopDTO {
	return shopDTO{ID: s.ID, Name: s.Name, CollectionIDs: s.CollectionIDs}
}

func fromShopDTO(dto shopDTO) entity.Shop {
	return entity.Shop{ID: dto.ID, Name: dto.Name, CollectionIDs: dto.CollectionIDs}
}

func toProductDTO(p *entity.Product) productDTO {
	return productDTO{ID: p.ID, Name: p.Name, Description: p.Description, Price: p.Price, CategoryIDs: p.CategoryIDs}
}

func toCategoryDTO(c *entity.Category) categoryDTO {
	return categoryDTO{ID: c.ID, Name: c.Name, ParentID: c.ParentID}
}

func toPaginatedProductsDTO(value *entity.PaginatedProducts) paginatedProductsDTO {
	products := make([]productDTO, 0, len(value.Products))
	for _, product := range value.Products {
		products = append(products, toProductDTO(product))
	}
	return paginatedProductsDTO{
		Products:   products,
		Page:       value.Page,
		Limit:      value.Limit,
		TotalCount: value.TotalCount,
		TotalPages: value.TotalPages,
	}
}

func (h *HTTPHandler) List(w http.ResponseWriter, r *http.Request) {
	shops := h.queries.List()
	response := make([]shopDTO, 0, len(shops))
	for _, shop := range shops {
		response = append(response, toShopDTO(shop))
	}
	httpx.WriteJSON(w, response)
}

func (h *HTTPHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	shop, err := h.queries.Get(id)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Shop not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to load shop", http.StatusInternalServerError)
		return
	}

	httpx.WriteJSON(w, toShopDTO(shop))
}

func (h *HTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload shopDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	shop := fromShopDTO(payload)
	created, err := h.commands.Create(&shop)
	if err != nil {
		http.Error(w, "Failed to persist shop", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	httpx.WriteJSON(w, toShopDTO(created))
}

func (h *HTTPHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	var payload shopDTO
	if err := httpx.ReadJSON(r, &payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	shop := fromShopDTO(payload)
	shop.ID = id
	updated, err := h.commands.Update(&shop)
	if err != nil {
		http.Error(w, "Failed to persist shop", http.StatusInternalServerError)
		return
	}

	httpx.WriteJSON(w, toShopDTO(updated))
}

func (h *HTTPHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	if err := h.commands.Delete(id); err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			http.Error(w, "Shop not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to persist shop", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *HTTPHandler) Products(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
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

	result := h.queries.Products(id, collID, catID, page, limit)
	httpx.WriteJSON(w, toPaginatedProductsDTO(result))
}

func (h *HTTPHandler) Categories(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.ParseID(r.URL.Path)
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

	categories := h.queries.Categories(id, collID, directOnly)
	response := make([]categoryDTO, 0, len(categories))
	for _, category := range categories {
		response = append(response, toCategoryDTO(category))
	}
	httpx.WriteJSON(w, response)
}
