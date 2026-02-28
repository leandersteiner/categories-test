package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
)

func ReadJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func WriteJSON(w http.ResponseWriter, v interface{}) {
	json.NewEncoder(w).Encode(v)
}

func ParseID(path string) (int, error) {
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
