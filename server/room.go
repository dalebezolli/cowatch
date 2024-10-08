package main

import (
	"errors"
	"time"
)

const DEFAULT_ROOM_SIZE = 10

type RoomID string

type Room struct {
	RoomID       RoomID
	VideoDetails VideoDetails
	Host         *Client
	Viewers      []*Client
	CreatedAt    Timestamp
	Settings     RoomSettings
}

type RoomSettings = struct {
	Name string `json:"name"`
}

var ErrRoomHasNoHost = errors.New("There's no host for the new room")

func NewRoom(roomID RoomID, host *Client, settings RoomSettings) (*Room, error) {
	if host == nil {
		return nil, ErrRoomHasNoHost
	}

	return &Room{
		RoomID: roomID,
		VideoDetails: VideoDetails{
			Title:           "",
			Author:          "",
			AuthorImage:     "",
			SubscriberCount: "",
			LikeCount:       "",
		},
		Host:      host,
		Viewers:   make([]*Client, 0, DEFAULT_ROOM_SIZE),
		CreatedAt: Timestamp(time.Now().Unix()),
		Settings:  settings,
	}, nil
}

func (room *Room) UpdateHost(host *Client) {
	room.Host = host
}

func (room *Room) AddViewer(viewer *Client) {
	room.Viewers = append(room.Viewers, viewer)
}

func (room *Room) RemoveViewer(viewer *Client) {
	roomIndex, recordFound := FindInSlice(room.Viewers, viewer, func(a *Client, b *Client) bool {
		return a.IPAddress == b.IPAddress
	})

	if recordFound {
		room.Viewers = RemoveFromSlice(room.Viewers, roomIndex)
	}
}

func (room *Room) SaveVideoDetails(vidoeDetails VideoDetails) {
	room.VideoDetails = vidoeDetails
}

type RoomRecord struct {
	RoomID    RoomID         `json:"roomID"`
	Host      ClientRecord   `json:"host"`
	Viewers   []ClientRecord `json:"viewers"`
	Settings  RoomSettings   `json:"settings"`
	CreatedAt Timestamp      `json:"createdAt"`
}

// Calculates only the necessary data to be sent to a request
func (room *Room) GetFilteredRoom() RoomRecord {
	var filteredRoom RoomRecord

	filteredHost := room.Host.GetFilteredClient()
	filteredViewers := make([]ClientRecord, 0, DEFAULT_ROOM_SIZE)

	for _, viewer := range room.Viewers {
		filteredViewers = append(filteredViewers, viewer.GetFilteredClient())
	}

	filteredRoom = RoomRecord{
		RoomID:    room.RoomID,
		Host:      filteredHost,
		Viewers:   filteredViewers,
		Settings:  room.Settings,
		CreatedAt: room.CreatedAt,
	}

	return filteredRoom
}
