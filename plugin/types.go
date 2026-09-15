package main

// PublicServerDTO represents safe, public server data exposed to visitors
type PublicServerDTO struct {
	ID         uint64 `json:"id"`
	Name       string `json:"name"`
	GameCode   string `json:"game_code"`
	GameName   string `json:"game_name"`
	Address    string `json:"address"`
	Port       int    `json:"port"`
	Status     string `json:"status"` // "online", "offline"
	Installed  bool   `json:"installed"`
	Blocked    bool   `json:"blocked"`
	ConnectURL string `json:"connect_url"`
}

// MonitoringResponse contains the list of servers and summary statistics
type MonitoringResponse struct {
	Success      bool              `json:"success"`
	TotalServers int               `json:"total_servers"`
	OnlineCount  int               `json:"online_count"`
	Servers      []PublicServerDTO `json:"servers"`
	Timestamp    int64             `json:"timestamp"`
}

// PluginSettings holds customizable options for the web monitoring plugin
type PluginSettings struct {
	Title                  string            `json:"title"`
	Subtitle               string            `json:"subtitle"`
	Theme                  string            `json:"theme"` // "dark" or "light"
	RefreshInterval        int               `json:"refresh_interval"`
	CustomCSS              string            `json:"custom_css"`
	CustomHeaderHTML       string            `json:"custom_header_html"`
	HiddenServers          []uint64          `json:"hidden_servers"`
	CachedServers          []PublicServerDTO `json:"cached_servers"`
	AddressKey             string            `json:"address_key,omitempty"`
	ServerAddressOverrides map[uint64]string `json:"server_address_overrides,omitempty"`
	ServerOrder            []uint64          `json:"server_order,omitempty"`
	LogoURL                string            `json:"logo_url,omitempty"`
	FaviconURL             string            `json:"favicon_url,omitempty"`
}
