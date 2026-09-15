//go:build wasip1

package main

import (
	"context"
	"log/slog"

	pluginproto "github.com/gameap/gameap/pkg/plugin/proto"
	"github.com/gameap/gameap/pkg/plugin/sdk"
	"github.com/gameap/gameap/pkg/plugin/sdk/games"
	"github.com/gameap/gameap/pkg/plugin/sdk/log"
)

func main() {}

var (
	logger      *slog.Logger
	serversRepo *ReadOnlyServersService
	gamesRepo   games.GamesService
)

type WebMonitoringPlugin struct {
	sdk.EmptyPluginService
}

func init() {
	logger = log.NewLogger()
	serversRepo = &ReadOnlyServersService{}
	gamesRepo = games.NewGamesService()

	pluginproto.RegisterPluginService(&WebMonitoringPlugin{})
}

func (p *WebMonitoringPlugin) GetInfo(
	_ context.Context,
	_ *pluginproto.GetInfoRequest,
) (*pluginproto.PluginInfo, error) {
	return &pluginproto.PluginInfo{
		Id:                  "monitoring",
		Name:                "GameAP WebMonitoring",
		Version:             PluginVersion,
		Description:         "Публичная страница для отображения работающих серверов",
		Author:              "GameAP Community",
		ApiVersion:          "1",
		RequiredPermissions: []string{"listen_events"},
	}, nil
}

func (p *WebMonitoringPlugin) Initialize(
	_ context.Context,
	_ *pluginproto.InitializeRequest,
) (*pluginproto.InitializeResponse, error) {
	if logger != nil {
		logger.Info("GameAP WebMonitoring plugin initialized successfully")
	}
	return &pluginproto.InitializeResponse{
		Result: &pluginproto.Result{Success: true},
	}, nil
}

func (p *WebMonitoringPlugin) Shutdown(
	_ context.Context,
	_ *pluginproto.ShutdownRequest,
) (*pluginproto.ShutdownResponse, error) {
	if logger != nil {
		logger.Info("GameAP WebMonitoring plugin shutting down")
	}
	return &pluginproto.ShutdownResponse{
		Result: &pluginproto.Result{Success: true},
	}, nil
}

func (p *WebMonitoringPlugin) GetSubscribedEvents(
	_ context.Context,
	_ *pluginproto.GetSubscribedEventsRequest,
) (*pluginproto.GetSubscribedEventsResponse, error) {
	return &pluginproto.GetSubscribedEventsResponse{
		Events: []pluginproto.EventType{
			pluginproto.EventType_EVENT_TYPE_SERVER_POST_START,
			pluginproto.EventType_EVENT_TYPE_SERVER_POST_STOP,
			pluginproto.EventType_EVENT_TYPE_SERVER_POST_RESTART,
			pluginproto.EventType_EVENT_TYPE_SERVER_CREATED,
			pluginproto.EventType_EVENT_TYPE_SERVER_UPDATED,
			pluginproto.EventType_EVENT_TYPE_SERVER_DELETED,
		},
	}, nil
}

func (p *WebMonitoringPlugin) HandleEvent(
	ctx context.Context,
	event *pluginproto.Event,
) (*pluginproto.EventResult, error) {
	defer func() {
		_ = recover()
	}()

	if event == nil {
		return &pluginproto.EventResult{Handled: true}, nil
	}

	if logger != nil {
		logger.Debug("Received GameAP event", slog.Int("type", int(event.Type)))
	}

	serverEvent := event.GetServerEvent()
	if serverEvent != nil && serverEvent.Server != nil {
		s := serverEvent.Server
		settings := GetSettings(ctx)
		if settings != nil {
			changed := false
			switch event.Type {
			case pluginproto.EventType_EVENT_TYPE_SERVER_CREATED:
				found := false
				for i, existing := range settings.CachedServers {
					if existing.ID == s.Id {
						settings.CachedServers[i] = ConvertProtoServerToDTO(s, "", settings)
						found = true
						changed = true
						break
					}
				}
				if !found {
					settings.CachedServers = append(settings.CachedServers, ConvertProtoServerToDTO(s, "", settings))
					changed = true
				}

			case pluginproto.EventType_EVENT_TYPE_SERVER_UPDATED:
				for i, existing := range settings.CachedServers {
					if existing.ID == s.Id {
						dto := ConvertProtoServerToDTO(s, existing.GameName, settings)
						settings.CachedServers[i] = dto
						changed = true
						break
					}
				}

			case pluginproto.EventType_EVENT_TYPE_SERVER_DELETED:
				newList := make([]PublicServerDTO, 0, len(settings.CachedServers))
				for _, existing := range settings.CachedServers {
					if existing.ID != s.Id {
						newList = append(newList, existing)
					} else {
						changed = true
					}
				}
				if changed {
					settings.CachedServers = newList
				}

			case pluginproto.EventType_EVENT_TYPE_SERVER_POST_START:
				for i, existing := range settings.CachedServers {
					if existing.ID == s.Id {
						settings.CachedServers[i].Status = "online"
						changed = true
						break
					}
				}

			case pluginproto.EventType_EVENT_TYPE_SERVER_POST_STOP:
				for i, existing := range settings.CachedServers {
					if existing.ID == s.Id {
						settings.CachedServers[i].Status = "offline"
						changed = true
						break
					}
				}

			case pluginproto.EventType_EVENT_TYPE_SERVER_POST_RESTART:
				for i, existing := range settings.CachedServers {
					if existing.ID == s.Id {
						settings.CachedServers[i].Status = "online"
						changed = true
						break
					}
				}
			}

			if changed {
				_ = SaveSettings(ctx, settings)
			}
		}
	}

	return &pluginproto.EventResult{
		Handled: true,
	}, nil
}
