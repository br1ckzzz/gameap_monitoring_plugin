package main

import (
	"testing"

	serverproto "github.com/gameap/gameap/pkg/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

func makeAnyString(s string) *anypb.Any {
	anyVal, _ := anypb.New(wrapperspb.String(s))
	return anyVal
}

func ptrString(s string) *string {
	return &s
}

func TestCleanAndValidateAddress(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty", "", ""},
		{"spaces", "   ", ""},
		{"valid_ipv4", "192.168.1.1", "192.168.1.1"},
		{"valid_public_ipv4", "8.8.8.8", "8.8.8.8"},
		{"valid_hostname", "astartis-gamehost.ru", "astartis-gamehost.ru"},
		{"valid_subdomain", "play.mc-server.net", "play.mc-server.net"},
		{"hostname_with_port", "astartis-gamehost.ru:1024", "astartis-gamehost.ru"},
		{"ipv4_with_port", "192.168.0.188:27015", "192.168.0.188"},
		{"hostname_with_https", "https://astartis-gamehost.ru", "astartis-gamehost.ru"},
		{"hostname_with_trailing_slash", "astartis-gamehost.ru/", "astartis-gamehost.ru"},
		{"ipv6", "2001:db8::1", "2001:db8::1"},
		{"ipv6_with_brackets_port", "[2001:db8::1]:27015", "2001:db8::1"},
		// Security test cases
		{"xss_tag", "<script>alert(1)</script>", ""},
		{"xss_img", "<img src=x onerror=alert(1)>", ""},
		{"spaces_inside", "astartis gamehost ru", ""},
		{"invalid_chars", "astartis;rm -rf /", ""},
		{"invalid_ip_range", "192.168.1.999", ""},
		{"sql_injection", "1.1.1.1' OR '1'='1", ""},
		{"newline_injection", "astartis-gamehost.ru\n127.0.0.1", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CleanAndValidateAddress(tt.input)
			if got != tt.expected {
				t.Errorf("CleanAndValidateAddress(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestResolveServerAddress(t *testing.T) {
	// Case 1: public_ip in metadata (as shown in user's screenshot)
	t.Run("public_ip in metadata", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       1,
			ServerIp: "192.168.0.188",
			Metadata: map[string]*anypb.Any{
				"public_ip": makeAnyString("astartis-gamehost.ru"),
			},
		}
		got := ResolveServerAddress(s, nil)
		if got != "astartis-gamehost.ru" {
			t.Errorf("Expected 'astartis-gamehost.ru', got %q", got)
		}
	})

	// Case 2: public_ip with port accidentally included in metadata
	t.Run("public_ip with port in metadata", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       1,
			ServerIp: "192.168.0.188",
			Metadata: map[string]*anypb.Any{
				"public_ip": makeAnyString("astartis-gamehost.ru:1024"),
			},
		}
		got := ResolveServerAddress(s, nil)
		if got != "astartis-gamehost.ru" {
			t.Errorf("Expected 'astartis-gamehost.ru', got %q", got)
		}
	})

	// Case 3: Other common keys (e.g. domain, hostname, external_ip) in metadata
	t.Run("domain key in metadata", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       2,
			ServerIp: "10.0.0.1",
			Metadata: map[string]*anypb.Any{
				"domain": makeAnyString("game.myhost.com"),
			},
		}
		got := ResolveServerAddress(s, nil)
		if got != "game.myhost.com" {
			t.Errorf("Expected 'game.myhost.com', got %q", got)
		}
	})

	// Case 4: Server variables JSON (Vars)
	t.Run("public_ip in server vars JSON", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       3,
			ServerIp: "10.0.0.2",
			Vars:     ptrString(`{"public_ip": "play.myserver.org", "maxplayers": "32"}`),
		}
		got := ResolveServerAddress(s, nil)
		if got != "play.myserver.org" {
			t.Errorf("Expected 'play.myserver.org', got %q", got)
		}
	})

	// Case 5: Custom key configured by administrator in settings
	t.Run("custom address key in settings", func(t *testing.T) {
		settings := &PluginSettings{
			AddressKey: "connect_domain",
		}
		s := &serverproto.Server{
			Id:       4,
			ServerIp: "192.168.1.50",
			Metadata: map[string]*anypb.Any{
				"connect_domain": makeAnyString("custom-entry.ru"),
			},
		}
		got := ResolveServerAddress(s, settings)
		if got != "custom-entry.ru" {
			t.Errorf("Expected 'custom-entry.ru', got %q", got)
		}
	})

	// Case 6: Per-server override in settings
	t.Run("per-server override in settings", func(t *testing.T) {
		settings := &PluginSettings{
			ServerAddressOverrides: map[uint64]string{
				5: "forced-override.ru",
			},
		}
		s := &serverproto.Server{
			Id:       5,
			ServerIp: "192.168.0.188",
			Metadata: map[string]*anypb.Any{
				"public_ip": makeAnyString("astartis-gamehost.ru"),
			},
		}
		got := ResolveServerAddress(s, settings)
		if got != "forced-override.ru" {
			t.Errorf("Expected 'forced-override.ru', got %q", got)
		}
	})

	// Case 7: Malicious / XSS string in metadata -> safely falls back to ServerIp
	t.Run("malicious metadata fallback to ServerIp", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       6,
			ServerIp: "192.168.0.188",
			Metadata: map[string]*anypb.Any{
				"public_ip": makeAnyString("<script>evil()</script>"),
			},
		}
		got := ResolveServerAddress(s, nil)
		if got != "192.168.0.188" {
			t.Errorf("Expected fallback to '192.168.0.188', got %q", got)
		}
	})

	// Case 8: No metadata or vars -> falls back to ServerIp
	t.Run("default fallback to ServerIp", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       7,
			ServerIp: "192.168.0.188",
		}
		got := ResolveServerAddress(s, nil)
		if got != "192.168.0.188" {
			t.Errorf("Expected fallback to '192.168.0.188', got %q", got)
		}
	})

	// Case 9: Comma and semicolon separated keys in AddressKey settings
	t.Run("comma and semicolon separated keys in AddressKey", func(t *testing.T) {
		settings := &PluginSettings{
			AddressKey: "missing_key, another_missing; my_public_host; third_key",
		}
		s := &serverproto.Server{
			Id:       8,
			ServerIp: "10.0.0.1",
			Metadata: map[string]*anypb.Any{
				"my_public_host": makeAnyString("server.example.com"),
			},
		}
		got := ResolveServerAddress(s, settings)
		if got != "server.example.com" {
			t.Errorf("Expected 'server.example.com', got %q", got)
		}
	})

	// Case 10: Value contains multiple IPs separated by comma and semicolon (prefers public IP)
	t.Run("multiple IPs separated by comma and semicolon", func(t *testing.T) {
		s := &serverproto.Server{
			Id:       9,
			ServerIp: "127.0.0.1",
			Metadata: map[string]*anypb.Any{
				"public_ip": makeAnyString("127.0.0.1, 46.138.244.41; 192.168.1.1"),
			},
		}
		got := ResolveServerAddress(s, nil)
		if got != "46.138.244.41" {
			t.Errorf("Expected '46.138.244.41', got %q", got)
		}
	})
}

func TestSortServersByOrder(t *testing.T) {
	servers := []PublicServerDTO{
		{ID: 1, Name: "Server One"},
		{ID: 2, Name: "Server Two"},
		{ID: 3, Name: "Server Three"},
		{ID: 4, Name: "Server Four"},
	}

	t.Run("reorders according to given sequence", func(t *testing.T) {
		order := []uint64{3, 1, 4, 2}
		sorted := SortServersByOrder(servers, order)
		expected := []uint64{3, 1, 4, 2}
		for i, s := range sorted {
			if s.ID != expected[i] {
				t.Fatalf("At index %d: expected ID %d, got %d", i, expected[i], s.ID)
			}
		}
	})

	t.Run("partial order keeps unlisted servers at the end", func(t *testing.T) {
		order := []uint64{4, 2}
		sorted := SortServersByOrder(servers, order)
		expected := []uint64{4, 2, 1, 3}
		for i, s := range sorted {
			if s.ID != expected[i] {
				t.Fatalf("At index %d: expected ID %d, got %d", i, expected[i], s.ID)
			}
		}
	})

	t.Run("empty order leaves servers intact", func(t *testing.T) {
		sorted := SortServersByOrder(servers, nil)
		if len(sorted) != len(servers) {
			t.Fatalf("Expected length %d, got %d", len(servers), len(sorted))
		}
		for i, s := range sorted {
			if s.ID != servers[i].ID {
				t.Fatalf("At index %d: expected ID %d, got %d", i, servers[i].ID, s.ID)
			}
		}
	})

	t.Run("order with nonexistent IDs does not break", func(t *testing.T) {
		order := []uint64{999, 2, 888}
		sorted := SortServersByOrder(servers, order)
		expected := []uint64{2, 1, 3, 4}
		for i, s := range sorted {
			if s.ID != expected[i] {
				t.Fatalf("At index %d: expected ID %d, got %d", i, expected[i], s.ID)
			}
		}
	})
}
