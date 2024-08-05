package main

import (
	"encoding/json"
	"time"

	"github.com/cowatch/logger"
)

type ClientRequestType string
type ClientAction struct {
	ActionType ClientRequestType `json:"actionType"`
	Action string `json:"action"`
}

type ClientRequestHandler func(client *Client, manager *Manager, clientAction string)
const (
	ClientActionTypeAuthorize = "Authorize"
	ClientActionTypeHostRoom  = "HostRoom"
	ClientActionTypeJoinRoom  = "JoinRoom"
	ClientActionTypeDisconnectRoom = "DisconnectRoom"
	ClientActionTypeSendReflection = "SendReflection"
	ClientActionTypePing = "Ping"
)

type ClientRequestAuthorizeRoom struct {
	Name  string `json:"name"`
	Image string `json:"image"`
	PrivateToken PrivateToken `json:"privateToken"`
}

type ServerResponseAuthorizeRoom struct {
	Name  string `json:"name"`
	Image string `json:"image"`
	PrivateToken PrivateToken `json:"privateToken"`
	PublicToken PublicToken `json:"publicToken"`
}

func AuthorizeHandler(client *Client, manager *Manager, clientRequest string) {
	var requestAuthorize ClientRequestAuthorizeRoom

	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &requestAuthorize)
	if errorParsingRequest != nil {
		logger.Error("[%s] [Authorize] Bad json: %s\n", client.IPAddress, errorParsingRequest);
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
			Name: requestAuthorize.Name,
			Image: requestAuthorize.Image,
			Type: ClientTypeInnactive,
			PrivateToken: privateToken,
			PublicToken: publicToken,
		}
	}

	client.UpdateClientDetails(clientDetails)
	manager.RegisterClient(client)

	serverMessageAuthorize, serverMessageAuthorizeMarshalError := json.Marshal(ServerResponseAuthorizeRoom{
		Name: client.Name,
		Image: client.Image,
		PrivateToken: client.PrivateToken,
		PublicToken: client.PublicToken,
	})

	if serverMessageAuthorizeMarshalError != nil {
		logger.Error("[%s] [Authorize] Failed to marshal host room response: %s\n", client.IPAddress, serverMessageAuthorizeMarshalError)
		client.SendMessage(ServerMessageTypeAuthorize, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}
	client.SendMessage(ServerMessageTypeAuthorize, serverMessageAuthorize, ServerMessageStatusOk, "")

	// TODO: Attempt to resync if user is already in a room
}

type ClientRequestHostRoom ClientRecord

func HostRoomHandler(client *Client, manager *Manager, clientRequest string) {
	var requestHostRoom ClientRequestHostRoom

	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &requestHostRoom)

	if errorParsingRequest != nil {
		logger.Error("[%s] [HostRoom] Bad json: %s\n", client.IPAddress, errorParsingRequest);
		return
	}

	room := NewRoom(manager.GenerateUniqueRoomID(), client)
	manager.RegisterRoom(room)
	client.UpdateClientDetails(Client{ Name: requestHostRoom.Name, Image: requestHostRoom.Image, RoomID: room.RoomID, Type: ClientTypeHost })

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
	Name   string `json:"name"`
	Image  string `json:"image"`
	RoomID RoomID `json:"roomID"`
}

func JoinRoomHandler(client *Client, manager *Manager, clientRequest string) {
	var requestJoinRoom ClientRequestJoinRoom

	errorParsingAction := json.Unmarshal([]byte(clientRequest), &requestJoinRoom)
	if errorParsingAction != nil {
		logger.Error("[%s] [JoinRoom] Client sent bad json object: %s\n", client.IPAddress, errorParsingAction);
		client.SendMessage(ServerMessageTypeJoinRoom, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	client.UpdateClientDetails(Client{ Name: requestJoinRoom.Name, Image: requestJoinRoom.Image, Type: ClientTypeViewer, RoomID: requestJoinRoom.RoomID })

	room := manager.GetRegisteredRoom(client.RoomID)
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

	room.AddViewer(client)

	filteredRoom := room.GetFilteredRoom()

	serverMessageJoinRoom, serverMessageJoinRoomMarshalError := json.Marshal(filteredRoom)
	if serverMessageJoinRoomMarshalError != nil {
		logger.Error("[%s] [JoinRoom] Failed to marshal host room response: %s\n", client.IPAddress, serverMessageJoinRoomMarshalError)
		client.SendMessage(ServerMessageTypeJoinRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
	}

	client.SendMessage(ServerMessageTypeJoinRoom, serverMessageJoinRoom, ServerMessageStatusOk, "")
	updateRoomClientsWithLatestChanges(*room)
}

func DisconnectRoomHandler(client *Client, manager *Manager, clientRequest string) {
	manager.DisconnectClient(client)
}

type RoomReflection struct {
	ID	   string `json:"id"`
	Title  string `json:"title"`
	Author string `json:"author"`
	State  int    `json:"state"`
	CurrentTime float32 `json:"currentTime"`
	Duration    float32 `json:"duration"`
}

func ReflectRoomHandler(client *Client, manager *Manager, clientRequest string) {
	var reflection RoomReflection
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &reflection)

	if errorParsingRequest != nil {
		logger.Error("[%s] [ReflectRoom] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest);
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageBadJson)
		return
	}

	if client.Type != ClientTypeHost {
		logger.Info("[%s] [ReflectRoom] Client isn't a host\n", client.IPAddress)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageClientNotHost)
		return;
	}

	room := manager.GetRegisteredRoom(client.RoomID)
	if room == nil {
		logger.Info("[%s] [ReflectRoom] No room found with id: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageNoRoom)
		return
	}

	serverMessageReflection, serverMessageMarshalError := json.Marshal(reflection)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [ReflectRoom] Bad json: %s\n", client.IPAddress, client.RoomID)
		client.SendMessage(ServerMessageTypeReflectRoom, nil, ServerMessageStatusError, ServerErrorMessageInternalServerError)
		return
	}

	for _, viewer := range(room.Viewers) {
		viewer.SendMessage(ServerMessageTypeReflectRoom, serverMessageReflection, ServerMessageStatusOk, "")
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
		logger.Error("[%s] [Ping] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest);
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

	for _, viewer := range(room.Viewers) {
		if(viewer.Connection == nil) {
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
		for _, viewer := range(room.Viewers) {
			manager.DisconnectClient(viewer)
		}

		manager.UnregisterRoom(room)
	} else if client.Type == ClientTypeViewer {
		room.RemoveViewer(client)
		updateRoomClientsWithLatestChanges(*room)
	}

	client.UpdateClientDetails(Client{ Type: ClientTypeInnactive, RoomID: "" })
	client.SendMessage(ServerMessageTypeDisconnectRoom, nil, ServerMessageStatusOk, "")
}
