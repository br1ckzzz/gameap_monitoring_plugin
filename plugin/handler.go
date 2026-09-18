//go:build wasip1

package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	pluginproto "github.com/gameap/gameap/pkg/plugin/proto"
)

// Embedded frontend assets compiled directly into the WASM binary
var (
	//go:embed assets/index.html
	indexHTML []byte

	//go:embed assets/styles.css
	stylesCSS []byte

	//go:embed assets/app.js
	appJS []byte

	//go:embed assets/admin_bundle.js
	adminBundleJS []byte
)

func (p *WebMonitoringPlugin) GetFrontendBundle(
	_ context.Context,
	_ *pluginproto.GetFrontendBundleRequest,
) (*pluginproto.GetFrontendBundleResponse, error) {
	return &pluginproto.GetFrontendBundleResponse{
		HasBundle: true,
		Bundle:    adminBundleJS,
	}, nil
}

func (p *WebMonitoringPlugin) GetAssets(
	_ context.Context,
	_ *pluginproto.GetAssetsRequest,
) (*pluginproto.GetAssetsResponse, error) {
	return &pluginproto.GetAssetsResponse{
		FrontendFiles: []*pluginproto.AssetFile{
			{Path: "plugins/web-monitoring/index.html", Content: indexHTML},
			{Path: "plugins/web-monitoring/styles.css", Content: stylesCSS},
			{Path: "plugins/web-monitoring/app.js", Content: appJS},
		},
	}, nil
}

func (p *WebMonitoringPlugin) GetHTTPRoutes(
	_ context.Context,
	_ *pluginproto.GetHTTPRoutesRequest,
) (*pluginproto.GetHTTPRoutesResponse, error) {
	return &pluginproto.GetHTTPRoutesResponse{
		Routes: []*pluginproto.HTTPRoute{
			{
				Path:         "/",
				Methods:      []string{"GET", "POST"},
				RequiresAuth: false,
				AdminOnly:    false,
				Description:  "Canonical short public monitoring route (/api/plugins/monitoring)",
			},
			{
				Path:         "/servers",
				Methods:      []string{"GET"},
				RequiresAuth: false,
				AdminOnly:    false,
				Description:  "Get public list of active servers",
			},
			{
				Path:         "/view",
				Methods:      []string{"GET"},
				RequiresAuth: false,
				AdminOnly:    false,
				Description:  "Public web monitoring page (legacy compatibility alias)",
			},
			{
				Path:         "/settings",
				Methods:      []string{"GET", "POST"},
				RequiresAuth: false,
				AdminOnly:    false,
				Description:  "Web monitoring settings and customization",
			},
			{
				Path:         "/diagnostic",
				Methods:      []string{"GET"},
				RequiresAuth: false,
				AdminOnly:    false,
				Description:  "Diagnostic information about host GameAP services",
			},
		},
	}, nil
}

func (p *WebMonitoringPlugin) HandleHTTPRequest(
	ctx context.Context,
	req *pluginproto.HTTPRequest,
) (resp *pluginproto.HTTPResponse, err error) {
	// Top-level recovery to ensure plugin NEVER causes Wazero trap or "plugin error"
	defer func() {
		if r := recover(); r != nil {
			reqPath := ""
			if req != nil {
				reqPath = req.Path
			}
			if logger != nil {
				logger.Error("PANIC in HandleHTTPRequest", "path", reqPath, "recover", r)
			}
			resp = &pluginproto.HTTPResponse{
				StatusCode: int32(http.StatusOK),
				Headers: map[string]string{
					"Content-Type":                "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				Body: []byte(fmt.Sprintf(`{"success":false,"panic":true,"error":%q,"path":%q,"servers":[]}`, fmt.Sprintf("%v", r), reqPath)),
			}
			err = nil
		}
	}()

	if req == nil {
		return &pluginproto.HTTPResponse{
			StatusCode: int32(http.StatusOK),
			Headers:    map[string]string{"Content-Type": "application/json"},
			Body:       []byte(`{"success":false,"error":"nil request"}`),
		}, nil
	}

	targetPath := req.Path
	if targetPath == "/" || targetPath == "" {
		if req.QueryParams != nil {
			if actions, ok := req.QueryParams["action"]; ok && len(actions.Values) > 0 {
				switch actions.Values[0] {
				case "servers", "admin_servers", "all_servers":
					return p.handleServers(ctx, req)
				case "settings":
					return p.handleSettings(ctx, req)
				case "diagnostic":
					return p.handleDiagnostic(ctx, req)
				case "view":
					return p.handleView(ctx)
				}
			}
		}

		if req.Method == "POST" {
			return p.handleSettings(ctx, req)
		}

		if req.Headers != nil {
			accept := req.Headers["Accept"]
			if strings.Contains(accept, "application/json") && !strings.Contains(accept, "text/html") {
				return p.handleServers(ctx, req)
			}
		}

		return p.handleView(ctx)
	}

	switch targetPath {
	case "/servers":
		return p.handleServers(ctx, req)
	case "/view":
		return p.handleView(ctx)
	case "/settings":
		return p.handleSettings(ctx, req)
	case "/diagnostic":
		return p.handleDiagnostic(ctx, req)
	default:
		return &pluginproto.HTTPResponse{
			StatusCode: int32(http.StatusNotFound),
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
			Body: []byte(`{"error":"not found"}`),
		}, nil
	}
}

func (p *WebMonitoringPlugin) handleServers(ctx context.Context, req *pluginproto.HTTPRequest) (*pluginproto.HTTPResponse, error) {
	showAll := false
	if req != nil && req.QueryParams != nil {
		if vals, ok := req.QueryParams["all"]; ok && len(vals.Values) > 0 {
			if vals.Values[0] == "1" || vals.Values[0] == "true" {
				showAll = true
			}
		}
		if actions, ok := req.QueryParams["action"]; ok && len(actions.Values) > 0 {
			if actions.Values[0] == "admin_servers" || actions.Values[0] == "all_servers" {
				showAll = true
			}
		}
	}

	if showAll {
		allServers, fetchErr := FetchAllServers(ctx)
		if fetchErr != nil {
			if logger != nil {
				logger.Error("Failed to fetch all servers for admin", "error", fetchErr.Error())
			}
			return &pluginproto.HTTPResponse{
				StatusCode: int32(http.StatusOK),
				Headers: map[string]string{
					"Content-Type":                "application/json",
					"Access-Control-Allow-Origin": "*",
					"Cache-Control":               "no-cache, no-store, must-revalidate",
				},
				Body: []byte(fmt.Sprintf(`{"success":false,"error":%q,"total_servers":0,"online_count":0,"servers":[]}`, fetchErr.Error())),
			}, nil
		}

		onlineCount := 0
		for _, s := range allServers {
			if s.Status == "online" {
				onlineCount++
			}
		}

		res := MonitoringResponse{
			Success:      true,
			TotalServers: len(allServers),
			OnlineCount:  onlineCount,
			Servers:      allServers,
			Timestamp:    time.Now().Unix(),
		}
		bytes, _ := json.Marshal(res)
		return &pluginproto.HTTPResponse{
			StatusCode: int32(http.StatusOK),
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control":               "no-cache, no-store, must-revalidate",
			},
			Body: bytes,
		}, nil
	}

	data, fetchErr := FetchPublicServers(ctx)
	if fetchErr != nil {
		if logger != nil {
			logger.Error("Failed to fetch servers", "error", fetchErr.Error())
		}
		// Return HTTP 200 with error details so GameAP doesn't block the response with "plugin error"
		return &pluginproto.HTTPResponse{
			StatusCode: int32(http.StatusOK),
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control":               "no-cache, no-store, must-revalidate",
			},
			Body: []byte(fmt.Sprintf(`{"success":false,"error":%q,"total_servers":0,"online_count":0,"servers":[]}`, fetchErr.Error())),
		}, nil
	}

	return &pluginproto.HTTPResponse{
		StatusCode: int32(http.StatusOK),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control":               "no-cache, no-store, must-revalidate",
		},
		Body: data,
	}, nil
}

func (p *WebMonitoringPlugin) handleView(ctx context.Context) (*pluginproto.HTTPResponse, error) {
	pageContent := string(indexHTML)

	func() {
		defer func() {
			if r := recover(); r != nil {
				if logger != nil {
					logger.Warn("Failed applying view customizations", "recover", r)
				}
			}
		}()

		settings := GetSettings(ctx)

		if settings != nil {
			if settings.Title != "" {
				pageContent = strings.Replace(pageContent, "<title>Мониторинг игровых серверов | GameAP</title>", "<title>"+template.HTMLEscapeString(settings.Title)+" | GameAP</title>", 1)
				pageContent = strings.Replace(pageContent, "GameAP Servers", template.HTMLEscapeString(settings.Title), 1)
			}
			if settings.Subtitle != "" {
				pageContent = strings.Replace(pageContent, "Онлайн мониторинг игровых серверов", template.HTMLEscapeString(settings.Subtitle), 1)
			}
			if settings.CustomHeaderHTML != "" {
				pageContent = strings.Replace(pageContent, "<!-- CUSTOM_HEADER -->", settings.CustomHeaderHTML, 1)
			}
			if settings.CustomCSS != "" {
				customStyleTag := "<style id=\"admin-custom-css\">\n" + settings.CustomCSS + "\n</style>\n</head>"
				pageContent = strings.Replace(pageContent, "</head>", customStyleTag, 1)
			}
			if settings.Theme == "light" {
				pageContent = strings.Replace(pageContent, "<html lang=\"ru\">", "<html lang=\"ru\" data-theme=\"light\">", 1)
			}
			if settings.FaviconURL != "" {
				faviconTag := "<link rel=\"icon\" href=\"" + template.HTMLEscapeString(settings.FaviconURL) + "\">\n</head>"
				pageContent = strings.Replace(pageContent, "</head>", faviconTag, 1)
			}
			if settings.LogoURL != "" {
				logoTag := "<img src=\"" + template.HTMLEscapeString(settings.LogoURL) + "\" alt=\"Logo\" class=\"brand-logo\">"
				pageContent = strings.Replace(pageContent, "<div class=\"brand-icon\">🎮</div>", logoTag, 1)
			}
		}

		// Preload servers into HTML for instant 0ms first render (no spinner)
		if pubBytes, err := FetchPublicServers(ctx); err == nil && len(pubBytes) > 0 {
			preloadedScript := fmt.Sprintf("<script>window.INITIAL_DATA = %s;</script>\n</head>", string(pubBytes))
			pageContent = strings.Replace(pageContent, "</head>", preloadedScript, 1)
		}

		// Dynamically set footer version link to PluginVersion
		pageContent = strings.Replace(pageContent, "v1.0.0", "v"+PluginVersion, 1)
	}()

	if pageContent == "" {
		pageContent = string(indexHTML)
	}

	return &pluginproto.HTTPResponse{
		StatusCode: int32(http.StatusOK),
		Headers: map[string]string{
			"Content-Type":  "text/html; charset=utf-8",
			"Cache-Control": "no-cache, no-store, must-revalidate",
		},
		Body: []byte(pageContent),
	}, nil
}

func (p *WebMonitoringPlugin) handleSettings(ctx context.Context, req *pluginproto.HTTPRequest) (*pluginproto.HTTPResponse, error) {
	if req != nil && req.Method == "POST" {
		var newSettings PluginSettings
		if jsonErr := json.Unmarshal(req.Body, &newSettings); jsonErr != nil {
			return &pluginproto.HTTPResponse{
				StatusCode: int32(http.StatusOK),
				Headers: map[string]string{
					"Content-Type":                "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				Body: []byte(fmt.Sprintf(`{"success":false,"error":"invalid json: %s"}`, jsonErr.Error())),
			}, nil
		}
		if saveErr := SaveSettings(ctx, &newSettings); saveErr != nil {
			return &pluginproto.HTTPResponse{
				StatusCode: int32(http.StatusOK),
				Headers: map[string]string{
					"Content-Type":                "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				Body: []byte(fmt.Sprintf(`{"success":false,"error":%q}`, saveErr.Error())),
			}, nil
		}
		InvalidateCache()
		return &pluginproto.HTTPResponse{
			StatusCode: int32(http.StatusOK),
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			Body: []byte(`{"success":true}`),
		}, nil
	}

	// GET /settings
	settings := GetSettings(ctx)
	allServers, _ := FetchAllServers(ctx)

	type adminSettingsResponse struct {
		Title                  string            `json:"title"`
		Subtitle               string            `json:"subtitle"`
		Theme                  string            `json:"theme"`
		RefreshInterval        int               `json:"refresh_interval"`
		CustomCSS              string            `json:"custom_css"`
		CustomHeaderHTML       string            `json:"custom_header_html"`
		HiddenServers          []uint64          `json:"hidden_servers"`
		CachedServers          []PublicServerDTO `json:"cached_servers"`
		AddressKey             string            `json:"address_key"`
		ServerAddressOverrides map[uint64]string `json:"server_address_overrides"`
		ServerOrder            []uint64          `json:"server_order"`
		LogoURL                string            `json:"logo_url"`
		FaviconURL             string            `json:"favicon_url"`
		Servers                []PublicServerDTO `json:"servers"`
		AllServers             []PublicServerDTO `json:"all_servers"`
	}

	cached := settings.CachedServers
	if len(allServers) > 0 {
		cached = allServers
	}

	respObj := adminSettingsResponse{
		Title:                  settings.Title,
		Subtitle:               settings.Subtitle,
		Theme:                  settings.Theme,
		RefreshInterval:        settings.RefreshInterval,
		CustomCSS:              settings.CustomCSS,
		CustomHeaderHTML:       settings.CustomHeaderHTML,
		HiddenServers:          settings.HiddenServers,
		CachedServers:          cached,
		AddressKey:             settings.AddressKey,
		ServerAddressOverrides: settings.ServerAddressOverrides,
		ServerOrder:            settings.ServerOrder,
		LogoURL:                settings.LogoURL,
		FaviconURL:             settings.FaviconURL,
		Servers:                allServers,
		AllServers:             allServers,
	}

	bytes, err := json.Marshal(respObj)
	if err != nil {
		return &pluginproto.HTTPResponse{
			StatusCode: int32(http.StatusOK),
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			Body: []byte(fmt.Sprintf(`{"error":"failed to marshal settings: %s"}`, err.Error())),
		}, nil
	}
	return &pluginproto.HTTPResponse{
		StatusCode: int32(http.StatusOK),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control":               "no-cache, no-store, must-revalidate",
		},
		Body: bytes,
	}, nil
}

func (p *WebMonitoringPlugin) handleDiagnostic(ctx context.Context, req *pluginproto.HTTPRequest) (*pluginproto.HTTPResponse, error) {
	clientIP := ""
	trustedDetected := false
	if req != nil && req.Headers != nil {
		if ip, ok := req.Headers["X-Gameap-Client-Ip"]; ok && ip != "" {
			clientIP = ip
			trustedDetected = true
		} else if xff, ok := req.Headers["X-Forwarded-For"]; ok && xff != "" {
			clientIP = xff
		} else if xri, ok := req.Headers["X-Real-IP"]; ok && xri != "" {
			clientIP = xri
		}
	}

	diag := RunDiagnostic(ctx)
	diag["client_ip"] = clientIP
	diag["trusted_header_detected"] = trustedDetected

	bytes, _ := json.MarshalIndent(diag, "", "  ")
	return &pluginproto.HTTPResponse{
		StatusCode: int32(http.StatusOK),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control":               "no-cache, no-store, must-revalidate",
		},
		Body: bytes,
	}, nil
}
