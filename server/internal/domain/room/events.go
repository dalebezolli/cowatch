package room

import (
	"fmt"

	"github.com/cowatch/internal/model"
)

type WSRoomMessageTriggerer interface {
	// TriggerRoomBroadcast()
	TriggerUserMessage(to model.PrivateID, response RoomResponse) error
}

type RoomEvent string
type RoomResponse string

func (r *Room) RunEventLoop() {
	for {
		fmt.Println("runEventLoop: Waiting for a message")

		select {
		case data := <-r.eventChan:
			fmt.Println("runEventLoop:", data)

			if data == "dc" {
				r.eventManager.TriggerUserMessage(r.owner, "dc")
			} else {
				r.eventManager.TriggerUserMessage(r.owner, "Received response!!!")
			}
		}
	}
}

func (r *Room) HandleRoomEvent(from model.PrivateID, event RoomEvent) {
	r.eventChan <- event
}
