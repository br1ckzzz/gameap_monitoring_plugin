//go:build wasip1

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gameap/gameap/pkg/plugin/sdk/games"
	"github.com/gameap/gameap/pkg/plugin/sdk/servers"
	serverproto "github.com/gameap/gameap/pkg/proto"
)


// FetchAllServers retrieves all servers from GameAP (including hidden ones) for the admin visibility settings
func FetchAllServers(ctx context.Context) ([]PublicServerDTO, error) {
	defer func() {
		_ = recover()
	}()

	var rawServers []*serverproto.Server
	if serversRepo != nil {
		func() {
			defer func() { _ = recover() }()
			resp, err := serversRepo.FindServers(ctx, &servers.FindServersRequest{})
			if err == nil && resp != nil {
				rawServers = resp.Servers
			}
		}()
	}

	// Fetch game definitions for friendly names if available
	gameNames := make(map[string]string)
	if gamesRepo != nil {
		func() {
			defer func() { _ = recover() }()
			if gResp, gErr := gamesRepo.FindGames(ctx, &games.FindGamesRequest{}); gErr == nil && gResp != nil {
				for _, g := range gResp.Games {
					if g != nil && g.Code != "" {
						gameNames[g.Code] = g.Name
					}
				}
			}
		}()
	}

	settings := GetSettings(ctx)

	list := make([]PublicServerDTO, 0)
	for _, s := range rawServers {
		if s == nil {
			continue
		}

		gName := ""
		if val, exists := gameNames[s.GameId]; exists && val != "" {
			gName = val
		}
		dto := ConvertProtoServerToDTO(s, gName, settings)
		list = append(list, dto)
	}

	// Fallback to CachedServers saved from GameAP Admin if live serverRepo returned 0
	if len(list) == 0 {
		if settings != nil && len(settings.CachedServers) > 0 {
			list = append(list, settings.CachedServers...)
		}
	}

	// Apply manual server ordering if configured
	if settings != nil && len(settings.ServerOrder) > 0 {
		list = SortServersByOrder(list, settings.ServerOrder)
	}

	return list, nil
}

var (
	cachedPublicResponse []byte
	cachedPublicTime     time.Time
	cachedPublicList     []PublicServerDTO
)

// InvalidateCache clears the in-memory response cache (e.g. after settings changes)
func InvalidateCache() {
	cachedPublicResponse = nil
	cachedPublicTime = time.Time{}
	cachedPublicList = nil
}

// FetchPublicServers queries GameAP server repository safely and returns JSON bytes
func FetchPublicServers(ctx context.Context) ([]byte, error) {
	// Micro-cache: Return cached response if under 4 seconds to protect GameAP queue during traffic spikes
	if cachedPublicResponse != nil && time.Since(cachedPublicTime) < 4*time.Second {
		return cachedPublicResponse, nil
	}

	all, err := FetchAllServers(ctx)
	if err != nil {
		return nil, err
	}

	settings := GetSettings(ctx)
	hiddenMap := make(map[uint64]bool)
	if settings != nil {
		for _, hid := range settings.HiddenServers {
			hiddenMap[hid] = true
		}
	}

	list := make([]PublicServerDTO, 0)
	onlineCount := 0

	for _, s := range all {
		// Don't show blocked/suspended servers or servers hidden by admin in public monitoring
		if s.Blocked || hiddenMap[s.ID] {
			continue
		}
		if s.Status == "online" {
			onlineCount++
		}
		list = append(list, s)
	}

	res := MonitoringResponse{
		Success:      true,
		TotalServers: len(list),
		OnlineCount:  onlineCount,
		Servers:      list,
		Timestamp:    time.Now().Unix(),
	}

	bytes, err := json.Marshal(res)
	if err == nil {
		cachedPublicResponse = bytes
		cachedPublicTime = time.Now()
		cachedPublicList = list
	}
	return bytes, err
}

// RunDiagnostic runs test calls to all host libraries and returns detailed diagnostic JSON
func RunDiagnostic(ctx context.Context) map[string]interface{} {
	diag := make(map[string]interface{})
	diag["plugin_id"] = "monitoring"
	diag["version"] = PluginVersion

	// Test serversRepo
	serversInfo := make(map[string]interface{})
	if serversRepo == nil {
		serversInfo["available"] = false
		serversInfo["error"] = "serversRepo is nil"
	} else {
		serversInfo["available"] = true
		func() {
			defer func() {
				if r := recover(); r != nil {
					serversInfo["find_servers_panic"] = fmt.Sprintf("%v", r)
				}
			}()
			sResp, sErr := serversRepo.FindServers(ctx, &servers.FindServersRequest{})
			if sErr != nil {
				serversInfo["find_servers_error"] = sErr.Error()
			} else if sResp != nil {
				serversInfo["find_servers_success"] = true
				serversInfo["server_count"] = len(sResp.Servers)
				names := make([]string, 0, len(sResp.Servers))
				for _, srv := range sResp.Servers {
					if srv != nil {
						names = append(names, fmt.Sprintf("%s (%s:%d, active=%v)", srv.Name, srv.ServerIp, srv.ServerPort, srv.ProcessActive))
					}
				}
				serversInfo["servers"] = names
			}
		}()
	}
	diag["servers_service"] = serversInfo

	// Test gamesRepo
	gamesInfo := make(map[string]interface{})
	if gamesRepo == nil {
		gamesInfo["available"] = false
	} else {
		gamesInfo["available"] = true
		func() {
			defer func() {
				if r := recover(); r != nil {
					gamesInfo["find_games_panic"] = fmt.Sprintf("%v", r)
				}
			}()
			gResp, gErr := gamesRepo.FindGames(ctx, &games.FindGamesRequest{})
			if gErr != nil {
				gamesInfo["find_games_error"] = gErr.Error()
			} else if gResp != nil {
				gamesInfo["find_games_success"] = true
				gamesInfo["games_count"] = len(gResp.Games)
			}
		}()
	}
	diag["games_service"] = gamesInfo

	settings := GetSettings(ctx)
	diag["settings"] = settings

	return diag
}

func formatGameName(code string) string {
	switch code {
	case "cstrike":
		return "Counter-Strike 1.6"
	case "csgo":
		return "Counter-Strike: Global Offensive"
	case "cs2":
		return "Counter-Strike 2"
	case "rust":
		return "Rust"
	case "minecraft":
		return "Minecraft"
	case "tf2":
		return "Team Fortress 2"
	case "samp":
		return "SA-MP"
	case "valheim":
		return "Valheim"
	case "ark":
		return "ARK: Survival Evolved"
	case "left4dead2":
		return "Left 4 Dead 2"
	default:
		return code
	}
}

func isSteamGame(code string) bool {
	switch code {
	case "cstrike", "csgo", "cs2", "rust", "tf2", "valheim", "ark", "left4dead2", "garrysmod":
		return true
	default:
		return false
	}
}

// ConvertProtoServerToDTO converts GameAP proto Server to public monitoring DTO
func ConvertProtoServerToDTO(s *serverproto.Server, gameName string, settings *PluginSettings) PublicServerDTO {
	if s == nil {
		return PublicServerDTO{}
	}

	gName := gameName
	if gName == "" {
		gName = formatGameName(s.GameId)
	}

	isInstalled := s.Installed == serverproto.ServerInstalledStatus_SERVER_INSTALLED_STATUS_INSTALLED

	status := "offline"
	if s.ProcessActive {
		status = "online"
	}

	resolvedAddress := ResolveServerAddress(s, settings)

	connectURL := ""
	if isSteamGame(s.GameId) && resolvedAddress != "" && s.ServerPort > 0 {
		connectURL = fmt.Sprintf("steam://connect/%s:%d", resolvedAddress, s.ServerPort)
	}

	return PublicServerDTO{
		ID:         s.Id,
		Name:       s.Name,
		GameCode:   s.GameId,
		GameName:   gName,
		Address:    resolvedAddress,
		Port:       int(s.ServerPort),
		Status:     status,
		Installed:  isInstalled,
		Blocked:    s.Blocked,
		ConnectURL: connectURL,
	}
}
