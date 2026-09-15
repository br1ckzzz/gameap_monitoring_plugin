//go:build wasip1

package main

import (
	"context"
	"encoding/json"

	"github.com/gameap/gameap/pkg/plugin/sdk/storage"
)


var (
	currentSettings = DefaultSettings()
	storageRepo     = storage.NewStorageService()
)

func DefaultSettings() *PluginSettings {
	return &PluginSettings{
		Title:                  "GameAP Servers",
		Subtitle:               "Онлайн мониторинг игровых серверов",
		Theme:                  "dark",
		RefreshInterval:        15,
		CustomCSS:              "",
		CustomHeaderHTML:       "",
		HiddenServers:          make([]uint64, 0),
		CachedServers:          make([]PublicServerDTO, 0),
		AddressKey:             "",
		ServerAddressOverrides: make(map[uint64]string),
		ServerOrder:            make([]uint64, 0),
		LogoURL:                "",
		FaviconURL:             "",
	}
}

// GetSettings retrieves settings from memory cache or database storage
func GetSettings(ctx context.Context) *PluginSettings {
	// If in-memory settings has cached servers, return it directly
	if currentSettings != nil && len(currentSettings.CachedServers) > 0 {
		return currentSettings
	}

	// Try reading persistent settings from GameAP storage database
	if storageRepo != nil && ctx != nil {
		func() {
			defer func() { _ = recover() }()
			resp, err := storageRepo.Get(ctx, &storage.StorageGetRequest{Key: "settings"})
			if err == nil && resp != nil && resp.Found && len(resp.Payload) > 0 {
				var loaded PluginSettings
				if jErr := json.Unmarshal(resp.Payload, &loaded); jErr == nil {
					currentSettings = &loaded
				}
			}
		}()
	}

	if currentSettings == nil {
		currentSettings = DefaultSettings()
	}
	return currentSettings
}

// SaveSettings updates memory cache and persists to GameAP database storage
func SaveSettings(ctx context.Context, s *PluginSettings) error {
	if s == nil {
		s = DefaultSettings()
	}
	if s.RefreshInterval <= 0 {
		s.RefreshInterval = 15
	}
	if s.HiddenServers == nil {
		s.HiddenServers = make([]uint64, 0)
	}
	if s.CachedServers == nil {
		s.CachedServers = make([]PublicServerDTO, 0)
	}
	if s.ServerOrder == nil {
		s.ServerOrder = make([]uint64, 0)
	}
	if s.Theme == "" {
		s.Theme = "dark"
	}

	currentSettings = s

	// Persist to GameAP database storage
	if storageRepo != nil && ctx != nil {
		func() {
			defer func() { _ = recover() }()
			payload, jErr := json.Marshal(s)
			if jErr == nil {
				_, _ = storageRepo.Set(ctx, &storage.StorageSetRequest{
					Key:     "settings",
					Payload: payload,
				})
			}
		}()
	}

	return nil
}
