//go:build wasip1

package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gameap/gameap/pkg/plugin/sdk/games"
	"github.com/gameap/gameap/pkg/plugin/sdk/servers"
	serverproto "github.com/gameap/gameap/pkg/proto"
)

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

// FetchPublicServers queries GameAP server repository safely and returns JSON bytes
func FetchPublicServers(ctx context.Context) ([]byte, error) {
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

	list := make([]PublicServerDTO, 0)
	onlineCount := 0

	settings := GetSettings(ctx)
	hiddenMap := make(map[uint64]bool)
	if settings != nil {
		for _, hid := range settings.HiddenServers {
			hiddenMap[hid] = true
		}
	}

	for _, s := range rawServers {
		if s == nil {
			continue
		}

		// Don't show blocked/suspended servers or servers hidden by admin
		if s.Blocked || hiddenMap[s.Id] {
			continue
		}

		// Friendly game name fallback
		gName := s.GameId
		if val, exists := gameNames[s.GameId]; exists && val != "" {
			gName = val
		} else {
			gName = formatGameName(s.GameId)
		}

		isInstalled := s.Installed == serverproto.ServerInstalledStatus_SERVER_INSTALLED_STATUS_INSTALLED

		// ProcessActive accurately indicates whether the server process is currently running
		status := "offline"
		if s.ProcessActive {
			status = "online"
			onlineCount++
		}

		// Direct connect link for Steam games
		connectURL := ""
		if isSteamGame(s.GameId) && s.ServerIp != "" && s.ServerPort > 0 {
			connectURL = fmt.Sprintf("steam://connect/%s:%d", s.ServerIp, s.ServerPort)
		}

		dto := PublicServerDTO{
			ID:         s.Id,
			Name:       s.Name,
			GameCode:   s.GameId,
			GameName:   gName,
			Address:    s.ServerIp,
			Port:       int(s.ServerPort),
			Status:     status,
			Installed:  isInstalled,
			Blocked:    s.Blocked,
			ConnectURL: connectURL,
		}

		list = append(list, dto)
	}

	// Fallback to CachedServers saved from GameAP Admin if live serverRepo returned 0
	if len(list) == 0 && settings != nil && len(settings.CachedServers) > 0 {
		for _, s := range settings.CachedServers {
			if hiddenMap[s.ID] {
				continue
			}
			if s.Status == "online" {
				onlineCount++
			}
			list = append(list, s)
		}
	}

	res := MonitoringResponse{
		Success:      true,
		TotalServers: len(list),
		OnlineCount:  onlineCount,
		Servers:      list,
	}

	return json.Marshal(res)
}

// RunDiagnostic runs test calls to all host libraries and returns detailed diagnostic JSON
func RunDiagnostic(ctx context.Context) map[string]interface{} {
	diag := make(map[string]interface{})
	diag["plugin_id"] = "bwbwb26fs5eje"
	diag["version"] = "0.0.1"

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
