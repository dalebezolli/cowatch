package room

import (
	"fmt"
	"time"

	"github.com/cowatch/internal/model"
)

func (r *Room) RunEventLoop() {
	for {
		fmt.Println("runEventLoop: Waiting for a message")

		select {
		case nextEvent := <-r.eventChan:
			if nextEvent.Type == RoomEventTypeDisconnect {
				r.eventManager.TriggerUserMessage(r.owner, "dc")
			} else {
				r.eventManager.TriggerUserMessage(r.owner, "Received response!!!")
			}
		}
	}
}

func (r *Room) HandleRoomEvent(event RoomEvent) {
	r.eventChan <- event
}

type WSRoomMessageTriggerer interface {
	TriggerUserMessage(to model.PrivateID, response RoomResponse) error
}

type RoomEvent struct {
	From        model.PrivateID `json:"from"`
	RequestDate time.Time       `json:"requestDate"`

	Type    RoomEventType `json:"type"`
	Details interface{}   `json:"details"`
}

type RoomEventType string

const (
	RoomEventTypeDisconnect RoomEventType = "disconnect"
)

type RoomResponse string
