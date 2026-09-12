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
	_ context.Context,
	event *pluginproto.Event,
) (*pluginproto.EventResult, error) {
	if event != nil && logger != nil {
		logger.Debug("Received GameAP event", slog.Int("type", int(event.Type)))
	}
	return &pluginproto.EventResult{
		Handled: true,
	}, nil
}
