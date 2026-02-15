package main

import (
	"log"
	"os"

	"categories-test/internal/server"
)

func main() {
	addr := getAddr()
	s := server.New(addr)
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
