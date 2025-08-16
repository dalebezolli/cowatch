package http

import (
	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
	"github.com/gorilla/websocket"
)

func (s *Server) TriggerUserMessage(to []model.PrivateID, response room.RoomResponse) error {
	for _, watcherId := range to {
		watcher, exists := s.watchers[watcherId]
		if !exists {
			return model.ErrNoWatcher
		}

		watcher.conn.WriteMessage(websocket.TextMessage, []byte(response))

		if response == "dc" {
			watcher.stopChan <- true
		}
	}

	return nil
}

func (s *Server) CloseRoom(roomID room.RoomID) {
	delete(s.rooms, roomID)
}
