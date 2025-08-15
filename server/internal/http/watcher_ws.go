package http

import (
	"log"
	"net/http"
	"strings"

	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
	"github.com/gorilla/websocket"
)

type Watcher struct {
	conn *websocket.Conn
	user *model.User
	room *room.Room

	stopChan chan bool
}

func newWatcher(conn *websocket.Conn, user *model.User, room *room.Room) *Watcher {
	return &Watcher{
		conn: conn,
		user: user,
		room: room,

		stopChan: make(chan bool),
	}
}

func (s *Server) connectToRoom(w http.ResponseWriter, r *http.Request) {
	roomID := room.RoomID(r.PathValue("roomId"))
	requestedRoom, exists := s.rooms[roomID]

	if !exists {
		w.WriteHeader(http.StatusNotFound)
		s.Send(w, nil, &model.CErrRoomDoesNotExist)
		return
	}

	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		cErr := model.CErrAddDetails(model.CErrWebsocketUpgrade, err.Error())
		s.Send(w, nil, &cErr)
		return
	}

	user := (r.Context().Value(AuthContextKey{"user"})).(*model.User)
	watcher := newWatcher(conn, user, requestedRoom)

	s.watchers[user.Id] = watcher

	go s.readPump(watcher)
}

func (s *Server) readPump(w *Watcher) {
	defer func() {
		s.cleanReadPump(w)
	}()

	go func() {
		<-w.stopChan
		s.cleanReadPump(w)
	}()

	for {
		var nextMsg room.RoomEvent
		err := w.conn.ReadJSON(&nextMsg)

		if err != nil {
			if strings.Contains(err.Error(), "use of closed network connection") {
				return
			}

			log.Printf("readPump: Error while reading next message %s for message: %+v", err, nextMsg)
			return
		}

		nextMsg.From = w.user.Id
		w.room.HandleRoomEvent(nextMsg)
	}
}

func (s *Server) cleanReadPump(w *Watcher) {
	if _, exists := s.watchers[w.user.Id]; !exists {
		return
	}

	err := w.conn.Close()
	if err != nil {
		return
	}

	close(w.stopChan)
	delete(s.watchers, w.user.Id)
}
