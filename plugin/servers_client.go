//go:build wasip1

package main

import (
	"context"

	"github.com/gameap/gameap/pkg/plugin/sdk/servers"
	wasm "github.com/knqyf263/go-plugin/wasm"
)

// Only import find_servers from gameap-servers.
// This prevents importing privileged save_server and delete_server functions
// which trigger GameAP manage_servers permission warnings.
//
//go:wasmimport gameap-servers find_servers
func _find_servers(ptr uint32, size uint32) uint64

type ReadOnlyServersService struct{}

func (s ReadOnlyServersService) FindServers(_ context.Context, request *servers.FindServersRequest) (*servers.FindServersResponse, error) {
	if request == nil {
		request = &servers.FindServersRequest{}
	}
	buf, err := request.MarshalVT()
	if err != nil {
		return nil, err
	}
	ptr, size := wasm.ByteToPtr(buf)
	ptrSize := _find_servers(ptr, size)
	wasm.Free(ptr)

	ptr = uint32(ptrSize >> 32)
	size = uint32(ptrSize)
	buf = wasm.PtrToByte(ptr, size)

	response := new(servers.FindServersResponse)
	err = response.UnmarshalVT(buf)
	if ptr != 0 {
		wasm.Free(ptr)
	}
	if err != nil {
		return nil, err
	}
	return response, nil
}
