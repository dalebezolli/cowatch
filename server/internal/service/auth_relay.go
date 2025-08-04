package service

import (
	"github.com/cowatch/internal/model"
	"github.com/cowatch/internal/repository"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type registerRequest struct {
	conn       *websocket.Conn
	responseCh chan repository.ProcessID
}

type broadcastRequest struct {
	id   repository.ProcessID
	user *model.User
}

type AuthRelay struct {
	awaitingListeners map[repository.ProcessID]*websocket.Conn
	registerCh        chan registerRequest
	broadcastCh       chan broadcastRequest
}

func NewAuthRelay() *AuthRelay {
	return &AuthRelay{
		awaitingListeners: make(map[repository.ProcessID]*websocket.Conn),
		registerCh:        make(chan registerRequest),
		broadcastCh:       make(chan broadcastRequest),
	}
}

func (ar *AuthRelay) RegisterAsListener(c *websocket.Conn) repository.ProcessID {
	response := make(chan repository.ProcessID)
	ar.registerCh <- registerRequest{conn: c, responseCh: response}
	return <-response
}

func (ar *AuthRelay) DoesListenerExist(id repository.ProcessID) bool {
	_, exists := ar.awaitingListeners[id]
	return exists
}

func (ar *AuthRelay) BroadcastAuth(id repository.ProcessID, user *model.User) {
	if !ar.DoesListenerExist(id) {
		return
	}

	ar.broadcastCh <- broadcastRequest{
		id:   id,
		user: user,
	}
}

func (ar *AuthRelay) Run() {
	for {
		select {
		case req := <-ar.registerCh:
			newId := repository.ProcessID(uuid.NewString())
			ar.awaitingListeners[newId] = req.conn
			req.responseCh <- newId
			break
		case req := <-ar.broadcastCh:
			conn := ar.awaitingListeners[req.id]

			conn.WriteJSON(req.user)
			conn.Close()
			delete(ar.awaitingListeners, req.id)

			break
		}
	}
}
