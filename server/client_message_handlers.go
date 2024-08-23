package main

import (
	"encoding/json"
	"time"

	"github.com/cowatch/logger"
)

type ClientRequestAuthorizeRoom struct {
	Name         string       `json:"name"`
	Image        string       `json:"image"`
	PrivateToken Token        `json:"privateToken"`
}

type ServerResponseAuthorizeRoom struct {
	Name         string       `json:"name"`
	Image        string       `json:"image"`
	PrivateToken Token        `json:"privateToken"`
	PublicToken  Token        `json:"publicToken"`
}

func AuthorizeHandler(client *Client, manager *Manager, clientRequest string) {
	var requestAuthorize ClientRequestAuthorizeRoom

	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &requestAuthorize)
	if errorParsingRequest != nil {
		logger.Error("[%s] [Authorize] Bad json: %s\n", client.IPAddress, errorParsingRequest)
		client.SendMessage(ServerMessageTypeAuthorize, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	var clientDetails Client
	var isClientAuthorized bool
	logger.Info("[%s] [Authorize] Autorizing client with token: '%s'\n", client.IPAddress, requestAuthorize.PrivateToken)
	if requestAuthorize.PrivateToken != "" {
		existingClient, exists := manager.GetClient(requestAuthorize.PrivateToken)
		logger.Info("[%s] [Authorize] Retrieving information for existing user? %t\n", client.IPAddress, exists)

		if exists {
			clientDetails = *existingClient
			isClientAuthorized = true
		}
	}

	if !isClientAuthorized {
		privateToken, publicToken := manager.GenerateUniqueClientTokens()
		clientDetails = Client{
			Name:         requestAuthorize.Name,
			Image:        requestAuthorize.Image,
			Type:         ClientTypeInnactive,
			PrivateToken: privateToken,
			PublicToken:  publicToken,
		}
	}

	client.UpdateClientDetails(clientDetails)
	manager.RegisterClient(client)

	serverMessageAuthorize, serverMessageAuthorizeMarshalError := json.Marshal(ServerResponseAuthorizeRoom{
		Name:         client.Name,
		Image:        client.Image,
		PrivateToken: client.PrivateToken,
		PublicToken:  client.PublicToken,
	})

	if serverMessageAuthorizeMarshalError != nil {
		logger.Error("[%s] [Authorize] Failed to marshal host room response: %s\n", client.IPAddress, serverMessageAuthorizeMarshalError)
		client.SendMessage(ServerMessageTypeAuthorize, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}

	client.SendMessage(ServerMessageTypeAuthorize, serverMessageAuthorize, ServerMessageStatusOk, "")
	if client.Type != ClientTypeHost && client.Type != ClientTypeViewer {
		return
	}

	JoinRoomHandler(client, manager, "{ \"roomID\": \""+string(client.RoomID)+"\" }")
}

func HostRoomHandler(client *Client, manager *Manager, clientRequest string) {
	room := NewRoom(manager.GenerateUniqueRoomID(), client)
	manager.RegisterRoom(room)
	client.UpdateClientDetails(Client{Type: ClientTypeHost, RoomID: room.RoomID})

	logger.Info("[%s] [HostRoom] Created room with id: %s\n", client.IPAddress, room.RoomID)

	filteredRoom := room.GetFilteredRoom()
	serverMessageHostRoom, serverMessageHostRoomMarshalError := json.Marshal(filteredRoom)

	if serverMessageHostRoomMarshalError != nil {
		logger.Error("[%s] [HostRoom] Failed to marshal host room response: %s\n", client.IPAddress, serverMessageHostRoomMarshalError)
		client.SendMessage(ServerMessageTypeHostRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}

	client.SendMessage(ServerMessageTypeHostRoom, serverMessageHostRoom, ServerMessageStatusOk, "")
}

type ClientRequestJoinRoom struct {
	RoomID RoomID `json:"roomID"`
}

func JoinRoomHandler(client *Client, manager *Manager, clientRequest string) {
	var requestJoinRoom ClientRequestJoinRoom

	errorParsingMessage := json.Unmarshal([]byte(clientRequest), &requestJoinRoom)
	if errorParsingMessage != nil {
		logger.Error("[%s] [JoinRoom] Client sent bad json object: %s\n", client.IPAddress, errorParsingMessage)
		client.SendMessage(ServerMessageTypeJoinRoom, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	room := manager.GetRegisteredRoom(requestJoinRoom.RoomID)
	if room == nil {
		logger.Info("[%s] [JoinRoom] No room found with id: %s\n", client.IPAddress, requestJoinRoom.RoomID)
		client.SendMessage(ServerMessageTypeJoinRoom, nil, ServerMessageStatusError, ServerErrorMessageNoRoom)
		return
	}

	if len(room.Viewers) >= DEFAULT_ROOM_SIZE {
		logger.Info("[%s] [JoinRoom] Not enough space to join room with id: %s\n", client.IPAddress, requestJoinRoom.RoomID)
		client.SendMessage(ServerMessageTypeJoinRoom, nil, ServerMessageStatusError, ServerErrorMessageFullRoom)
		return
	}

	logger.Debug("[%s] [JoinRoom] Adding user of type: %d\n", client.IPAddress, client.Type)
	if client.Type == ClientTypeHost {
		room.Host = client
	}

	if client.Type == ClientTypeViewer {
		for _, possibleOldClient := range room.Viewers {
			if client.PrivateToken == possibleOldClient.PrivateToken {
				room.RemoveViewer(possibleOldClient)
			}
		}
	}

	if client.Type == ClientTypeInnactive || client.Type == ClientTypeViewer {
		client.Type = ClientTypeViewer
		room.AddViewer(client)
	}

	client.UpdateClientDetails(Client{Type: client.Type, RoomID: requestJoinRoom.RoomID})

	filteredRoom := room.GetFilteredRoom()

	serverMessageJoinRoom, serverMessageJoinRoomMarshalError := json.Marshal(struct {
		Room RoomRecord `json:"room"`
		Type ClientType `json:"clientType"`
	}{
		Room: filteredRoom,
		Type: client.Type,
	})

	if serverMessageJoinRoomMarshalError != nil {
		logger.Error("[%s] [JoinRoom] Failed to marshal host room response: %s\n", client.IPAddress, serverMessageJoinRoomMarshalError)
		client.SendMessage(ServerMessageTypeJoinRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
	}

	if room.VideoDetails.Title != "" {
		serverMessageRoomDetails, serverMessageMarshalError := json.Marshal(room.VideoDetails)
		if serverMessageMarshalError != nil {
			logger.Error("[%s] [JoinRoom] Bad json: %s\n", client.IPAddress, client.RoomID)
		} else {
			client.SendMessage(ServerMessageTypeReflectVideoDetails, serverMessageRoomDetails, ServerMessageStatusOk, "")
		}
	}

	client.SendMessage(ServerMessageTypeJoinRoom, serverMessageJoinRoom, ServerMessageStatusOk, "")
	updateRoomClientsWithLatestChanges(*room)
}

func DisconnectRoomHandler(client *Client, manager *Manager, clientRequest string) {
	manager.DisconnectClient(client)
}

type RoomReflection struct {
	ID          string  `json:"id"`
	State       int     `json:"state"`
	CurrentTime float32 `json:"time"`
}

func ReflectRoomHandler(client *Client, manager *Manager, clientRequest string) {
	var reflection RoomReflection
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &reflection)

	if errorParsingRequest != nil {
		logger.Error("[%s] [ReflectRoom] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	room := manager.GetRegisteredRoom(client.RoomID)
	if room == nil {
		logger.Info("[%s] [ReflectRoom] No room found with id: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageNoRoom)
		return
	}

	if client.Type != ClientTypeHost {
		logger.Info("[%s] [ReflectRoom] Client isn't a host\n", client.IPAddress)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageClientNotHost)
		return
	}

	serverMessageReflection, serverMessageMarshalError := json.Marshal(reflection)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [ReflectRoom] Bad json: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}

	for _, viewer := range room.Viewers {
		viewer.SendMessage(ServerMessageTypeReflectRoom, serverMessageReflection, ServerMessageStatusOk, "")
	}
}

type VideoDetails struct {
	Title           string `json:"title"`
	Author          string `json:"author"`
	AuthorImage     string `json:"authorImage"`
	SubscriberCount string `json:"subscriberCount"`
	LikeCount       string `json:"likeCount"`
}

func ReflectDetailsHandler(client *Client, manager *Manager, clientRequest string) {
	var videoDetails VideoDetails
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &videoDetails)

	if errorParsingRequest != nil {
		logger.Error("[%s] [ReflectVideoDetails] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest)
		client.SendMessage(ServerMessageTypeReflectVideoDetails, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	room := manager.GetRegisteredRoom(client.RoomID)
	if room == nil {
		logger.Info("[%s] [ReflectVideoDetails] No room found with id: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypeReflectVideoDetails, nil, ServerMessageStatusError, ServerErrorMessageNoRoom)
		return
	}

	if client.Type != ClientTypeHost {
		logger.Info("[%s] [ReflectVideoDetails] Client isn't a host\n", client.IPAddress)
		client.SendMessage(ServerMessageTypeReflectVideoDetails, nil, ServerMessageStatusError, ServerErrorMessageClientNotHost)
		return
	}

	if videoDetails.Title == "" || videoDetails.Author == "" || videoDetails.AuthorImage == "" ||
		videoDetails.SubscriberCount == "" || videoDetails.LikeCount == "" {

		logger.Info("[%s] [ReflectVideoDetails] Client sent malformed details %+v\n", client.IPAddress, videoDetails)
		return
	}
	room.SaveVideoDetails(videoDetails)

	serverMessageRoomDetails, serverMessageMarshalError := json.Marshal(videoDetails)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [ReflectVideoDetails] Bad json: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypeReflectVideoDetails, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}

	for _, viewer := range room.Viewers {
		viewer.SendMessage(ServerMessageTypeReflectVideoDetails, serverMessageRoomDetails, ServerMessageStatusOk, "")
	}
}

type Timestamp int64

type PingPong struct {
	Timestamp Timestamp `json:"timestamp"`
}

func PingHandler(client *Client, manager *Manager, clientRequest string) {
	var ping PingPong
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &ping)

	if errorParsingRequest != nil {
		logger.Error("[%s] [Ping] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest)
		client.SendMessage(ServerMessageTypePong, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	pong := PingPong{
		Timestamp: Timestamp(time.Now().UnixMilli()),
	}

	serverMessagePong, serverMessageMarshalError := json.Marshal(pong)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [Ping] Bad json: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypePong, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}

	client.SendMessage(ServerMessageTypePong, serverMessagePong, ServerMessageStatusOk, "")
}

func updateRoomClientsWithLatestChanges(room Room) {
	filteredRoom := room.GetFilteredRoom()

	serverMessageUpdateRoom, serverMessageUpdateRoomMarshalError := json.Marshal(filteredRoom)
	if serverMessageUpdateRoomMarshalError != nil {
		logger.Error("[UpdateRoom] Bad json: %s\n", serverMessageUpdateRoomMarshalError)
	}

	if room.Host.Connection != nil {
		if serverMessageUpdateRoomMarshalError == nil {
			room.Host.SendMessage(ServerMessageTypeUpdateRoom, serverMessageUpdateRoom, ServerMessageStatusOk, "")
		} else {
			room.Host.SendMessage(ServerMessageTypeUpdateRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		}
	}

	for _, viewer := range room.Viewers {
		if viewer.Connection == nil {
			continue
		}

		if serverMessageUpdateRoomMarshalError == nil {
			viewer.SendMessage(ServerMessageTypeUpdateRoom, serverMessageUpdateRoom, ServerMessageStatusOk, "")
		} else {
			viewer.SendMessage(ServerMessageTypeUpdateRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		}
	}
}

// Disconnects a client from a room
// If the client is a Viewer, they are removed from the viewer list
// If the client is a Host, they disconnect every other viewer before closing the connection
func (manager *Manager) DisconnectClient(client *Client) {
	if !manager.IsClientRegistered(client) {
		return
	}

	room := manager.GetRegisteredRoom(client.RoomID)
	if room == nil {
		return
	}

	if client.Type == ClientTypeHost {
		for _, viewer := range room.Viewers {
			manager.DisconnectClient(viewer)
		}

		manager.UnregisterRoom(room)
	} else if client.Type == ClientTypeViewer {
		room.RemoveViewer(client)
		updateRoomClientsWithLatestChanges(*room)
	}

	client.UpdateClientDetails(Client{Type: ClientTypeInnactive, RoomID: ""})
	client.SendMessage(ServerMessageTypeDisconnectRoom, nil, ServerMessageStatusOk, "")
}
