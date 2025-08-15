package http

import (
	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
	"github.com/gorilla/websocket"
)

func (s *Server) TriggerUserMessage(to model.PrivateID, response room.RoomResponse) error {
	watcher, exists := s.watchers[to]
	if !exists {
		return model.ErrNoWatcher
	}

	watcher.conn.WriteMessage(websocket.TextMessage, []byte(response))

	if response == "dc" {
		watcher.stopChan <- true
	}

	return nil
}
