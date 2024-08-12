package main

const DEFAULT_ROOM_SIZE = 10

type RoomID string

type Room struct {
	RoomID       RoomID
	VideoDetails VideoDetails
	Host         *Client
	Viewers      []*Client
}

func NewRoom(roomID RoomID, host *Client) *Room {
	return &Room{
		RoomID: roomID,
		VideoDetails: VideoDetails{
			Title:           "",
			Author:          "",
			AuthorImage:     "",
			SubscriberCount: "",
			LikeCount:       "",
		},
		Host:    host,
		Viewers: make([]*Client, 0, DEFAULT_ROOM_SIZE),
	}
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
	RoomID  RoomID         `json:"roomID"`
	Host    ClientRecord   `json:"host"`
	Viewers []ClientRecord `json:"viewers"`
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
		RoomID:  room.RoomID,
		Host:    filteredHost,
		Viewers: filteredViewers,
	}

	return filteredRoom
}
