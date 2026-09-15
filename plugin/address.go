package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net"
	"regexp"
	"sort"
	"strings"

	serverproto "github.com/gameap/gameap/pkg/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

var (
	hostnameRegex = regexp.MustCompile(
		`^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$`,
	)
	ipLikeRegex = regexp.MustCompile(`^[\d.]+$|^[\da-fA-F:]+$`)
)

// IsValidIPOrHostname checks if a string is a valid IPv4, IPv6, or domain hostname.
// Rejects any invalid format, XSS strings, special characters, spaces, or excessively long strings.
func IsValidIPOrHostname(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 253 {
		return false
	}

	if net.ParseIP(value) != nil {
		return true
	}

	if value == "localhost" {
		return true
	}

	if ipLikeRegex.MatchString(value) {
		return false
	}

	return hostnameRegex.MatchString(value)
}

// isPublicAddress checks if an address is likely a public address (domain or non-private IP).
func isPublicAddress(addr string) bool {
	ip := net.ParseIP(addr)
	if ip == nil {
		// Valid hostname is assumed public
		return true
	}
	return !ip.IsPrivate() && !ip.IsLoopback() && !ip.IsUnspecified() && !ip.IsLinkLocalUnicast()
}

// cleanSingleAddress sanitizes a single address candidate (stripping protocols, trimming, stripping accidental ports).
func cleanSingleAddress(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	// Strip URL scheme if present (e.g. "http://", "https://")
	if idx := strings.Index(raw, "://"); idx != -1 {
		raw = raw[idx+3:]
	}

	// Strip trailing path/slash if present
	if idx := strings.Index(raw, "/"); idx != -1 {
		raw = raw[:idx]
	}

	// Strip port if user accidentally included it (e.g. "astartis-gamehost.ru:1024" or "[::1]:27015")
	if strings.HasPrefix(raw, "[") && strings.Contains(raw, "]") {
		if host, _, err := net.SplitHostPort(raw); err == nil {
			raw = host
		} else {
			raw = strings.Trim(raw, "[]")
		}
	} else if strings.Count(raw, ":") == 1 {
		if host, _, err := net.SplitHostPort(raw); err == nil {
			raw = host
		}
	}

	raw = strings.TrimSpace(raw)
	if IsValidIPOrHostname(raw) {
		return raw
	}

	return ""
}

// CleanAndValidateAddress sanitizes an address candidate.
// If the input contains multiple items separated by comma ',' or semicolon ';',
// it evaluates each candidate and selects the best one (preferring public IPs or hostnames).
func CleanAndValidateAddress(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	// If multiple addresses are listed (separated by comma or semicolon)
	if strings.ContainsAny(raw, ",;") {
		parts := strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';'
		})
		var fallback string
		for _, part := range parts {
			cleaned := cleanSingleAddress(part)
			if cleaned != "" {
				if isPublicAddress(cleaned) {
					return cleaned
				}
				if fallback == "" {
					fallback = cleaned
				}
			}
		}
		if fallback != "" {
			return fallback
		}
		return ""
	}

	return cleanSingleAddress(raw)
}

// parseKeyList splits a key string by comma ',' or semicolon ';' into a slice of trimmed key names.
func parseKeyList(raw string) []string {
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';'
	})
	var keys []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			keys = append(keys, trimmed)
		}
	}
	return keys
}

// ExtractMetadataString unpacks a string from a protobuf Any value stored in server Metadata.
func ExtractMetadataString(anyVal *anypb.Any) string {
	if anyVal == nil {
		return ""
	}

	// Attempt standard protobuf StringValue unmarshal
	var sv wrapperspb.StringValue
	if err := anyVal.UnmarshalTo(&sv); err == nil {
		return strings.TrimSpace(sv.GetValue())
	}

	// Fallback to manual StringValue wire unpack: field 1 (0x0a), varint len, string bytes
	if len(anyVal.Value) > 0 {
		if anyVal.Value[0] == 0x0a && len(anyVal.Value) > 1 {
			l, n := binary.Uvarint(anyVal.Value[1:])
			if n > 0 && int(1+n+int(l)) <= len(anyVal.Value) {
				return strings.TrimSpace(string(anyVal.Value[1+n : 1+n+int(l)]))
			}
		}
		// Direct UTF-8 string fallback
		return strings.TrimSpace(string(anyVal.Value))
	}

	return ""
}

// ExtractVarsMap parses the Server.Vars JSON string into a key-value map.
func ExtractVarsMap(varsStr *string) map[string]string {
	if varsStr == nil || *varsStr == "" {
		return nil
	}

	res := make(map[string]string)
	var rawMap map[string]interface{}
	if err := json.Unmarshal([]byte(*varsStr), &rawMap); err == nil {
		for k, v := range rawMap {
			if str, ok := v.(string); ok {
				res[k] = str
			} else if v != nil {
				res[k] = fmt.Sprintf("%v", v)
			}
		}
	}

	return res
}

// Default candidate keys to check for public address in metadata and server variables.
var defaultAddressKeys = []string{
	"public_ip",
	"public_address",
	"domain",
	"hostname",
	"server_domain",
	"external_ip",
	"public_host",
	"host",
}

// ResolveServerAddress determines the public-facing address for a server following priority rules:
// 1. Manual per-server address override in plugin settings (if defined)
// 2. Custom AddressKey(s) configured by administrator in plugin settings (can be comma- or semicolon-separated)
// 3. Official GameAP metadata "public_ip" (checked in Metadata)
// 4. Fallback candidate keys in Metadata ("public_address", "domain", "hostname", "server_domain", etc.)
// 5. Candidate keys in Vars ("public_ip", "public_address", "domain", "hostname", etc.)
// 6. Default ServerIp from the server record (bind IP)
func ResolveServerAddress(s *serverproto.Server, settings *PluginSettings) string {
	if s == nil {
		return ""
	}

	// 1. Manual per-server override in settings
	if settings != nil && len(settings.ServerAddressOverrides) > 0 {
		if override, ok := settings.ServerAddressOverrides[s.Id]; ok && override != "" {
			if clean := CleanAndValidateAddress(override); clean != "" {
				return clean
			}
		}
	}

	varsMap := ExtractVarsMap(s.Vars)

	// 2. Custom AddressKey(s) configured by admin in settings (comma or semicolon separated list)
	if settings != nil && settings.AddressKey != "" {
		customKeys := parseKeyList(settings.AddressKey)
		for _, key := range customKeys {
			if s.Metadata != nil {
				if val, ok := s.Metadata[key]; ok {
					if clean := CleanAndValidateAddress(ExtractMetadataString(val)); clean != "" {
						return clean
					}
				}
			}
			if varsMap != nil {
				if val, ok := varsMap[key]; ok {
					if clean := CleanAndValidateAddress(val); clean != "" {
						return clean
					}
				}
			}
		}
	}

	// 3 & 4. Standard candidate keys in Metadata
	if s.Metadata != nil {
		for _, key := range defaultAddressKeys {
			if val, ok := s.Metadata[key]; ok {
				if clean := CleanAndValidateAddress(ExtractMetadataString(val)); clean != "" {
					return clean
				}
			}
		}
	}

	// 5. Standard candidate keys in Server Vars
	if varsMap != nil {
		for _, key := range defaultAddressKeys {
			if val, ok := varsMap[key]; ok {
				if clean := CleanAndValidateAddress(val); clean != "" {
					return clean
				}
			}
		}
	}

	// 6. Fallback to Server.ServerIp
	if clean := CleanAndValidateAddress(s.ServerIp); clean != "" {
		return clean
	}

	return s.ServerIp
}

// SortServersByOrder sorts a slice of PublicServerDTO based on user-defined ServerOrder.
// Servers listed in order appear first in that specified sequence.
// Any servers not present in order are appended at the end, retaining their relative order.
func SortServersByOrder(servers []PublicServerDTO, order []uint64) []PublicServerDTO {
	if len(order) == 0 || len(servers) <= 1 {
		return servers
	}

	orderMap := make(map[uint64]int, len(order))
	for idx, id := range order {
		orderMap[id] = idx
	}

	type indexedServer struct {
		server PublicServerDTO
		pos    int
		orig   int
	}

	items := make([]indexedServer, len(servers))
	for i, s := range servers {
		pos, exists := orderMap[s.ID]
		if !exists {
			pos = len(order) + i
		}
		items[i] = indexedServer{server: s, pos: pos, orig: i}
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].pos != items[j].pos {
			return items[i].pos < items[j].pos
		}
		return items[i].orig < items[j].orig
	})

	sorted := make([]PublicServerDTO, len(servers))
	for i, it := range items {
		sorted[i] = it.server
	}
	return sorted
}
