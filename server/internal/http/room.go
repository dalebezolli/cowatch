package http

import (
	"net/http"

	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
)

func (s *Server) createRoom(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(AuthContextKey{"user"}).(*model.User)

	newRoom, err := room.NewRoom("Test room", user.Id, s)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		cErr := model.CErrAddDetails(model.CErrRoomFailedToInitialize, err.Error())
		s.Send(w, nil, &cErr)
		return
	}

	s.rooms[newRoom.RoomID] = newRoom
	go newRoom.RunEventLoop()

	s.Send(w, newRoom, nil)
}

func (s *Server) getRoom(w http.ResponseWriter, r *http.Request) {
	roomID := room.RoomID(r.PathValue("roomId"))
	requestedRoom, exists := s.rooms[roomID]

	if !exists {
		w.WriteHeader(http.StatusNotFound)
		s.Send(w, nil, &model.CErrRoomDoesNotExist)
		return
	}

	s.Send(w, requestedRoom, nil)
}
