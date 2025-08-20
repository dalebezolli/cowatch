package room

import (
	"time"

	"github.com/cowatch/internal/model"
	"github.com/google/uuid"
)

type RoomID string

type Room struct {
	Name   string `json:"name"`
	RoomID RoomID `json:"id"`

	watchers         map[model.PrivateID]bool
	hosts            map[model.PrivateID]bool
	playlist         []*VideoDetails
	latestReflection *VideoState
	owner            model.PrivateID

	eventChan    chan RoomEvent
	eventManager WSRoomMessageTriggerer
}

type VideoDetails struct {
	VideoID  string
	QueuedBy model.PrivateID
}

type VideoState struct {
	VideoId         string          `json:"videoId"`
	PlaybackState   int             `json:"playbackState"`
	PlaybackSeconds int             `json:"playbackSeconds"`
	From            model.PrivateID `json:"-"`
	At              time.Time       `json:"sentAt"`
}

func NewRoom(name string, owner model.PrivateID, eventManager WSRoomMessageTriggerer) (*Room, error) {
	if owner == "" {
		return nil, model.ErrNoRoomOwnerDefined
	}

	room := &Room{
		Name:   name,
		RoomID: RoomID(uuid.NewString()),

		watchers:         make(map[model.PrivateID]bool),
		hosts:            make(map[model.PrivateID]bool),
		playlist:         make([]*VideoDetails, 0, 10),
		latestReflection: nil,
		owner:            owner,

		eventChan:    make(chan RoomEvent),
		eventManager: eventManager,
	}

	room.UpgradeToHost(owner)

	return room, nil
}

func (r *Room) AddUser(watcher model.PrivateID) {
	r.watchers[watcher] = true

	r.SendRoomEvent(RoomEvent{
		Type:        RoomEventTypeInitConnection,
		From:        watcher,
		RequestDate: time.Now(),
	})
}

func (r *Room) GetActiveUsers() []model.PrivateID {
	watchers := make([]model.PrivateID, 0, len(r.watchers))
	for watcher, exists := range r.watchers {
		if !exists {
			continue
		}
		watchers = append(watchers, watcher)
	}

	return watchers
}

func (r *Room) RemoveUser(id model.PrivateID) {
	r.watchers[id] = false

	if r.latestReflection != nil && id == r.latestReflection.From {
		r.SendRoomEvent(RoomEvent{
			Type:        RoomEventTypeGetNextAvailableHost,
			From:        id,
			RequestDate: time.Now(),
		})
	}
}

func (r *Room) UpgradeToHost(id model.PrivateID) {
	r.hosts[id] = true
}

func (r *Room) DowngradeFromHost(id model.PrivateID) {
	delete(r.hosts, id)
}

func (r *Room) IsHost(id model.PrivateID) bool {
	_, exists := r.hosts[id]
	return exists
}
