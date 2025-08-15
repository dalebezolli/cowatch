package watcher

import (
	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
)

type WSWatcherMessageTriggerer interface {
	TriggerUserMessage(to model.PrivateID, response string) error
}

type Watcher struct {
	user *model.User
	room *room.Room

	readChan       chan string
	writeChan      chan string
	disconnectChan chan bool
}

func NewWatcher(user *model.User, room *room.Room) *Watcher {
	return &Watcher{
		user: user,
		room: room,

		readChan:       make(chan string),
		writeChan:      make(chan string),
		disconnectChan: make(chan bool),
	}
}

func (w *Watcher) HandleUserMessage(user *model.User, room *room.Room) {
}
