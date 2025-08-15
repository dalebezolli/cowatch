package room

import (
	"github.com/cowatch/internal/model"
	"github.com/google/uuid"
)

type RoomID string

type Room struct {
	Name   string `json:"name"`
	RoomID RoomID `json:"id"`

	watchers    map[model.PrivateID]bool
	hosts       map[model.PrivateID]bool
	playlist    []*VideoDetails
	latestState *VideoState
	owner       model.PrivateID

	eventChan    chan RoomEvent
	eventManager WSRoomMessageTriggerer
}

type VideoDetails struct {
	VideoID  string
	QueuedBy model.PrivateID
}

type VideoState struct {
	VideoID    string
	VideoState int
	SecondsIn  float32
	QueuedBy   model.PrivateID
}

func NewRoom(name string, owner model.PrivateID, eventManager WSRoomMessageTriggerer) (*Room, error) {
	if owner == "" {
		return nil, model.ErrNoRoomOwnerDefined
	}

	return &Room{
		Name:   name,
		RoomID: RoomID(uuid.NewString()),

		watchers:    make(map[model.PrivateID]bool),
		hosts:       make(map[model.PrivateID]bool),
		playlist:    make([]*VideoDetails, 0, 10),
		latestState: nil,
		owner:       owner,

		eventChan:    make(chan RoomEvent),
		eventManager: eventManager,
	}, nil
}

func (r *Room) AddUser(watcher model.PrivateID) {
	r.watchers[watcher] = true
}

func (r *Room) GetUsers() []model.PrivateID {
	watchers := make([]model.PrivateID, 0, len(r.watchers))
	for watcher := range r.watchers {
		watchers = append(watchers, watcher)
	}

	return watchers
}

func (r *Room) RemoveUser(id model.PrivateID) {
	delete(r.watchers, id)
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
