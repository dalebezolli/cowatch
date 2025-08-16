package http

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
	"github.com/gorilla/websocket"
)

type Watcher struct {
	conn *websocket.Conn
	user *model.User
	room *room.Room

	stopChan   chan bool
	tickerPing *time.Ticker
}

const (
	watcherMaxMessageSize = 512
	pingPeriod            = 10 * time.Second
	pongWait              = (pingPeriod * 3) / 2
)

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
	requestedRoom.AddUser(user.Id)

	go s.readPump(watcher)
	go s.ping(watcher)
}

func (s *Server) readPump(w *Watcher) {
	defer func() {
		s.cleanReadPump(w)
	}()

	go func() {
		<-w.stopChan
		s.cleanReadPump(w)
	}()

	w.conn.SetReadLimit(watcherMaxMessageSize)
	w.conn.SetReadDeadline(time.Now().Add(pongWait))
	w.conn.SetPongHandler(func(string) error {
		w.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var nextMsg room.RoomEvent
		err := w.conn.ReadJSON(&nextMsg)

		if err != nil {
			if strings.Contains(err.Error(), "use of closed network connection") {
				return
			}

			log.Printf("readPump: Error while reading next message %s for message: %+v\n", err, nextMsg)
			return
		}

		nextMsg.From = w.user.Id
		w.room.HandleRoomEvent(nextMsg)
	}
}

func (s *Server) ping(w *Watcher) {
	w.tickerPing = time.NewTicker(pingPeriod)

	defer func() {
		w.tickerPing.Stop()
	}()

	for {
		<-w.tickerPing.C
		if err := w.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			return
		}
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

	w.tickerPing.Stop()
	close(w.stopChan)
	delete(s.watchers, w.user.Id)
}
