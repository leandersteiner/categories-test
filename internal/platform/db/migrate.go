package db

import (
	"embed"
	"fmt"
	"path/filepath"
	"sort"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func ApplyMigrations(client *Client) error {
	if err := client.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`); err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}

	versions := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			versions = append(versions, entry.Name())
		}
	}
	sort.Strings(versions)

	for _, version := range versions {
		rows, err := client.Query(fmt.Sprintf("SELECT version FROM schema_migrations WHERE version = %s;", QuoteString(version)))
		if err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if len(rows) > 0 {
			continue
		}

		path := filepath.ToSlash(filepath.Join("migrations", version))
		sqlBytes, err := migrationFiles.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}

		script := "BEGIN;\n" + string(sqlBytes) + "\n" +
			fmt.Sprintf("INSERT INTO schema_migrations(version) VALUES (%s);\n", QuoteString(version)) +
			"COMMIT;"
		if err := client.Exec(script); err != nil {
			return fmt.Errorf("apply migration %s: %w", version, err)
		}
	}

	return nil
}
