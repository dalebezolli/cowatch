package main

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/cowatch/logger"
)

type Manager struct {
	upgrader websocket.Upgrader

	activeClients map[IPAddress]*Client
	activeRooms map[RoomID]*Room
	clientRequestHandlers map[ClientRequestType]ClientRequestHandler
}

func NewManager() *Manager {
	var manager = &Manager {
		upgrader:  websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(request *http.Request) bool { return true },
		},
		activeClients:	make(map[IPAddress]*Client),
		activeRooms:	make(map[RoomID]*Room),
		clientRequestHandlers: make(map[ClientRequestType]ClientRequestHandler),
	}

	manager.setupClientActionHandlers()
	return manager
}

func (manager *Manager) HandleConnection(writer http.ResponseWriter, request *http.Request) {
	websocketConnection, errorUpgradeWebsocket := manager.upgrader.Upgrade(writer, request, nil)
	clientAddress := websocketConnection.RemoteAddr()

	if errorUpgradeWebsocket != nil {
		logger.Error("[%s] Failed to establish websocket channel: %s\n", clientAddress, errorUpgradeWebsocket)
		return
	}

	defer func() {
		logger.Debug("Closing connection")
		websocketConnection.Close()
	}()

	client := NewClient(websocketConnection)
	if manager.IsClientRegistered(client) {
		logger.Error("[%s] A connection with this ip address already exists... exiting\n", clientAddress)
		return
	}

	manager.RegisterClient(client)
	defer func() {
		logger.Info("[%s] Client disconnected, cleaning up resources\n", client.IPAddress)
		manager.DisconnectClient(client)
		manager.UnregisterClient(client)
	}()

	logger.Info("[%s] Established connection\n", websocketConnection.RemoteAddr())

	for {
		if !manager.IsClientRegistered(client) {
			break
		}

		clientRequest, errorGetClientRequest := client.GetClientRequest()
		if errorGetClientRequest != nil {
			break
		}

		logger.Info("[%s] [%s] Handling Request: %s\n", client.IPAddress, clientRequest.ActionType,  clientRequest.Action)
		clientActionHandler, foundHandler := manager.clientRequestHandlers[clientRequest.ActionType]

		if !foundHandler {
			logger.Error("[%s] [%s] Handler for requested action does not exist\n", client.IPAddress, clientRequest.ActionType)
			continue
		}

		clientActionHandler(client, manager, clientRequest.Action)
	}
}

func (manager *Manager) RegisterClient(client *Client) {
	manager.activeClients[client.IPAddress] = client
}

func (manager *Manager) UnregisterClient(client *Client) {
	delete(manager.activeClients, client.IPAddress)
}

func (manager *Manager) IsClientRegistered(client *Client) bool {
	_, exists := manager.activeClients[client.IPAddress]
	return exists
}

func (manager *Manager) GenerateUniqueRoomID() RoomID {
	generatedId, _ := uuid.NewRandom()
	byteGeneratedId, _ := generatedId.MarshalText()
	var roomID RoomID
	var roomAlreadyExists = true

	for roomAlreadyExists {
		roomID = RoomID(byteGeneratedId[:8])
		_, roomAlreadyExists = manager.activeRooms[roomID]
	}

	return roomID
}

func (manager *Manager) RegisterRoom(room *Room) {
	manager.activeRooms[room.RoomID] = room
}

func (manager *Manager) UnregisterRoom(room *Room) {
	delete(manager.activeRooms, room.RoomID)
}

func (manager *Manager) GetRegisteredRoom(roomID RoomID) *Room {
	room, exists := manager.activeRooms[roomID]

	if exists {
		return room
	} else {
		return nil
	}
}

func (manager *Manager) setupClientActionHandlers() {
	manager.clientRequestHandlers[ClientActionTypeHostRoom] = HostRoomHandler
	manager.clientRequestHandlers[ClientActionTypeJoinRoom] = JoinRoomHandler
	manager.clientRequestHandlers[ClientActionTypeDisconnectRoom] = DisconnectRoomHandler
	manager.clientRequestHandlers[ClientActionTypeSendReflection] = ReflectRoomHandler
	manager.clientRequestHandlers[ClientActionTypePing] = PingHandler
}
