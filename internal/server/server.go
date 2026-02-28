package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"categories-test/internal/application/commands"
	"categories-test/internal/application/queries"
	"categories-test/internal/handlers"
	"categories-test/internal/store"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type Server struct {
	httpServer *http.Server
	store      *store.Store
}

func New(addr string) *Server {
	storage := store.New()
	commandService := commands.NewService(storage, storage, storage, storage)
	queryService := queries.NewService(storage, storage, storage, storage)

	s := &Server{
		store: storage,
	}

	mux := http.NewServeMux()
	h := handlers.New(commandService, queryService)

	mux.HandleFunc("GET /api/products", h.ListProducts)
	mux.HandleFunc("POST /api/products", h.CreateProduct)
	mux.HandleFunc("PUT /api/products/{id}", h.UpdateProduct)
	mux.HandleFunc("DELETE /api/products/{id}", h.DeleteProduct)

	mux.HandleFunc("GET /api/categories", h.ListCategories)
	mux.HandleFunc("POST /api/categories", h.CreateCategory)
	mux.HandleFunc("PUT /api/categories/{id}", h.UpdateCategory)
	mux.HandleFunc("DELETE /api/categories/{id}", h.DeleteCategory)

	mux.HandleFunc("GET /api/collections", h.ListCollections)
	mux.HandleFunc("POST /api/collections", h.CreateCollection)
	mux.HandleFunc("PUT /api/collections/{id}", h.UpdateCollection)
	mux.HandleFunc("DELETE /api/collections/{id}", h.DeleteCollection)

	mux.HandleFunc("GET /api/shops", h.ListShops)
	mux.HandleFunc("POST /api/shops", h.CreateShop)
	mux.HandleFunc("GET /api/shops/{id}", h.GetShop)
	mux.HandleFunc("GET /api/shops/{id}/products", h.GetShopProducts)
	mux.HandleFunc("GET /api/shops/{id}/categories", h.GetShopCategories)
	mux.HandleFunc("PUT /api/shops/{id}", h.UpdateShop)
	mux.HandleFunc("DELETE /api/shops/{id}", h.DeleteShop)

	handler := corsMiddleware(mux)

	s.httpServer = &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s
}

func (s *Server) Start() error {
	log.Printf("Server starting on %s", s.httpServer.Addr)
	if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func (s *Server) StartWithGracefulShutdown() error {
	errChan := make(chan error, 1)

	go func() {
		errChan <- s.Start()
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errChan:
		return err
	case <-quit:
		log.Println("Shutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := s.httpServer.Shutdown(ctx); err != nil {
			return err
		}
		log.Println("Server gracefully stopped")
		return nil
	}
}
