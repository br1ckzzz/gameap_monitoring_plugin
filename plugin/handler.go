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
				Description:  "Public web monitoring page",
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

	switch req.Path {
	case "/servers":
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

	case "/view":
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

	case "/settings":
		if req.Method == "POST" {
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
		bytes, err := json.Marshal(settings)
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

	case "/diagnostic":
		diag := RunDiagnostic(ctx)
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
