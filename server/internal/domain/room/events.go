package room

import (
	"context"
	"fmt"
	"time"

	"github.com/cowatch/internal/model"
)

const roomInactivityTime = 10 * time.Minute

func (r *Room) RunEventLoop() {
	defer func() {
		close(r.eventChan)
		r.eventManager.CloseRoom(r.RoomID)
	}()

	ctx, cancel := context.WithTimeout(context.Background(), roomInactivityTime)

	for {
		fmt.Println("runEventLoop: Waiting for a message")

		select {
		case nextEvent := <-r.eventChan:
			if nextEvent.Type == RoomEventTypeDisconnect {
				r.eventManager.TriggerUserMessage([]model.PrivateID{r.owner}, "dc")
			} else {
				r.eventManager.TriggerUserMessage([]model.PrivateID{r.owner}, "Received response!!!")
			}

			cancel()
			ctx, cancel = context.WithTimeout(context.Background(), roomInactivityTime)

		case <-ctx.Done():
			fmt.Println("Closing room due to inactivity, sending dc request to:", r.GetUsers())
			r.eventManager.TriggerUserMessage(r.GetUsers(), "dc")
			cancel()
			return
		}
	}
}

func (r *Room) HandleRoomEvent(event RoomEvent) {
	r.eventChan <- event
}

type WSRoomMessageTriggerer interface {
	TriggerUserMessage(to []model.PrivateID, response RoomResponse) error
	CloseRoom(roomID RoomID)
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
