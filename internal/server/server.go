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

	"categories-test/internal/categories"
	"categories-test/internal/collections"
	"categories-test/internal/products"
	"categories-test/internal/shops"
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

	productHandler := products.NewHTTPHandler(
		products.NewCommands(storage),
		products.NewQueries(storage),
	)
	categoryHandler := categories.NewHTTPHandler(
		categories.NewCommands(storage),
		categories.NewQueries(storage),
	)
	collectionHandler := collections.NewHTTPHandler(
		collections.NewCommands(storage),
		collections.NewQueries(storage),
	)
	shopHandler := shops.NewHTTPHandler(
		shops.NewCommands(storage),
		shops.NewQueries(storage),
	)

	s := &Server{
		store: storage,
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/products", productHandler.List)
	mux.HandleFunc("POST /api/products", productHandler.Create)
	mux.HandleFunc("PUT /api/products/{id}", productHandler.Update)
	mux.HandleFunc("DELETE /api/products/{id}", productHandler.Delete)

	mux.HandleFunc("GET /api/categories", categoryHandler.List)
	mux.HandleFunc("POST /api/categories", categoryHandler.Create)
	mux.HandleFunc("PUT /api/categories/{id}", categoryHandler.Update)
	mux.HandleFunc("DELETE /api/categories/{id}", categoryHandler.Delete)

	mux.HandleFunc("GET /api/collections", collectionHandler.List)
	mux.HandleFunc("POST /api/collections", collectionHandler.Create)
	mux.HandleFunc("PUT /api/collections/{id}", collectionHandler.Update)
	mux.HandleFunc("DELETE /api/collections/{id}", collectionHandler.Delete)

	mux.HandleFunc("GET /api/shops", shopHandler.List)
	mux.HandleFunc("POST /api/shops", shopHandler.Create)
	mux.HandleFunc("GET /api/shops/{id}", shopHandler.Get)
	mux.HandleFunc("GET /api/shops/{id}/products", shopHandler.Products)
	mux.HandleFunc("GET /api/shops/{id}/categories", shopHandler.Categories)
	mux.HandleFunc("PUT /api/shops/{id}", shopHandler.Update)
	mux.HandleFunc("DELETE /api/shops/{id}", shopHandler.Delete)

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
