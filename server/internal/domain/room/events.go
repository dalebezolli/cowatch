package room

import (
	"context"
	"encoding/json"
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
		select {
		case nextEvent := <-r.eventChan:

			switch t := nextEvent.Type; t {
			case RoomEventTypeInitConnection:
				responseDetails := RoomResponseDetailsInitConnection{
					IsOwner: nextEvent.From == r.owner,
					IsHost:  r.IsHost(nextEvent.From),
				}

				if r.latestReflection != nil {
					responseDetails.Reflection = r.latestReflection
				}

				response := RoomResponse{
					Type:    RoomResponseTypeInitConnection,
					Details: responseDetails,
				}

				r.eventManager.TriggerUserMessage([]model.PrivateID{nextEvent.From}, response)
			case RoomEventTypeGetNextAvailableHost:
				r.eventManager.TriggerUserMessage(r.GetActiveUsers(), RoomResponse{
					Type: RoomResponseTypeGetNextAvailableHost,
				})
			case RoomEventTypeReflect:
				var reflectData ReflectEventData
				json.Unmarshal([]byte(nextEvent.Details), &reflectData)

				r.OnReflectEvent(nextEvent.From, reflectData, nextEvent.RequestDate)
			case RoomEventTypeDisconnect:
				r.eventManager.TriggerUserMessage([]model.PrivateID{nextEvent.From}, RoomResponse{Type: RoomResponseTypeDisconnect})
			}

			cancel()
			ctx, cancel = context.WithTimeout(context.Background(), roomInactivityTime)

		case <-ctx.Done():
			fmt.Println("Closing room due to inactivity, sending dc request to:", r.GetActiveUsers())
			r.eventManager.TriggerUserMessage(r.GetActiveUsers(), RoomResponse{Type: RoomResponseTypeDisconnect})
			cancel()
			return
		}
	}
}

func (r *Room) SendRoomEvent(event RoomEvent) {
	r.eventChan <- event
}

type WSRoomMessageTriggerer interface {
	TriggerUserMessage(to []model.PrivateID, response RoomResponse) error
	CloseRoom(roomID RoomID)
}

type RoomEvent struct {
	From        model.PrivateID `json:"from"`
	RequestDate time.Time       `json:"requestDate"`
	Type        RoomEventType   `json:"type"`
	Details     string          `json:"details"`
}

type RoomEventType string

const (
	// Internal requests that are managed from the server
	RoomEventTypeInitConnection       RoomEventType = "initConnection"
	RoomEventTypeGetNextAvailableHost RoomEventType = "getNextAvailableHost"

	// User sent events
	RoomEventTypeReflect    RoomEventType = "reflect"
	RoomEventTypeDisconnect RoomEventType = "disconnect"
)

type ReflectEventData struct {
	VideoId         string `json:"videoId"`
	PlaybackState   int    `json:"playbackState"`
	PlaybackSeconds int    `json:"playbackSeconds"`
}

type RoomResponse struct {
	Type    RoomResponseType `json:"type"`
	Details any              `json:"details"`
}

type RoomResponseType string

const (
	RoomResponseTypeInitConnection       RoomResponseType = "initConnection"
	RoomResponseTypeGetNextAvailableHost RoomResponseType = "getNextAvailableHost"

	RoomResponseTypeReflect    RoomResponseType = "reflect"
	RoomResponseTypeDisconnect RoomResponseType = "disconnect"
)

type RoomResponseDetailsInitConnection struct {
	IsOwner    bool        `json:"isOwner"`
	IsHost     bool        `json:"isHost"`
	Reflection *VideoState `json:"reflection"`
}

func (r *Room) OnReflectEvent(from model.PrivateID, eventData ReflectEventData, requestDate time.Time) {
	if len(eventData.VideoId) == 0 || requestDate.IsZero() || len(from) == 0 {
		return
	}

	if !r.IsHost(from) {
		return
	}

	if r.latestReflection != nil && from != r.latestReflection.From && eventData.VideoId == r.latestReflection.VideoId {
		return
	}

	r.latestReflection = &VideoState{
		VideoId:         eventData.VideoId,
		PlaybackState:   eventData.PlaybackState,
		PlaybackSeconds: eventData.PlaybackSeconds,
		From:            from,
		At:              requestDate,
	}

	r.eventManager.TriggerUserMessage(r.GetActiveUsers(), RoomResponse{
		Type:    RoomResponseTypeReflect,
		Details: r.latestReflection,
	})
}
