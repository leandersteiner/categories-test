package db

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

type Client struct {
	path string
	mu   sync.Mutex
}

func OpenSQLite(path string) (*Client, error) {
	c := &Client{path: path}
	if err := c.Exec("SELECT 1;"); err != nil {
		return nil, fmt.Errorf("open sqlite at %s: %w", path, err)
	}
	if err := ApplyMigrations(c); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Client) Exec(sql string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	cmd := exec.Command("sqlite3", c.path, sql)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		return fmt.Errorf("sqlite exec failed: %s", msg)
	}
	return nil
}

func (c *Client) Query(sql string) ([]map[string]interface{}, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	cmd := exec.Command("sqlite3", "-json", c.path, sql)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		return nil, fmt.Errorf("sqlite query failed: %s", msg)
	}

	trimmed := strings.TrimSpace(string(out))
	if trimmed == "" {
		return []map[string]interface{}{}, nil
	}

	var rows []map[string]interface{}
	if err := json.Unmarshal(out, &rows); err != nil {
		return nil, fmt.Errorf("decode sqlite json: %w", err)
	}
	return rows, nil
}

func QuoteString(s string) string {
	escaped := strings.ReplaceAll(s, "'", "''")
	return "'" + escaped + "'"
}

func NullableInt(value *int) string {
	if value == nil {
		return "NULL"
	}
	return strconv.Itoa(*value)
}

func IntFrom(row map[string]interface{}, key string) int {
	v, ok := row[key]
	if !ok || v == nil {
		return 0
	}
	switch typed := v.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case string:
		i, _ := strconv.Atoi(typed)
		return i
	default:
		return 0
	}
}

func FloatFrom(row map[string]interface{}, key string) float64 {
	v, ok := row[key]
	if !ok || v == nil {
		return 0
	}
	switch typed := v.(type) {
	case float64:
		return typed
	case string:
		f, _ := strconv.ParseFloat(typed, 64)
		return f
	default:
		return 0
	}
}

func StringFrom(row map[string]interface{}, key string) string {
	v, ok := row[key]
	if !ok || v == nil {
		return ""
	}
	s, _ := v.(string)
	return s
}

func NullableIntFrom(row map[string]interface{}, key string) *int {
	v, ok := row[key]
	if !ok || v == nil {
		return nil
	}
	val := IntFrom(row, key)
	return &val
}
