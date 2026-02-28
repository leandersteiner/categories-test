package main

import (
	"log"
	"os"

	"categories-test/internal/server"
)

func main() {
	addr := getAddr()
	dbPath := getDBPath()
	s, err := server.New(addr, dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize server: %v", err)
		os.Exit(1)
	}
	if err := s.StartWithGracefulShutdown(); err != nil {
		log.Fatalf("Server error: %v", err)
		os.Exit(1)
	}
}

func getAddr() string {
	if port := os.Getenv("PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}

func getDBPath() string {
	if path := os.Getenv("SQLITE_PATH"); path != "" {
		return path
	}
	return "categories.db"
}
