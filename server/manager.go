package main

import (
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
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

	manager.setupUserActionHandlers()
	return manager
}

func (manager *Manager) HandleConnection(writer http.ResponseWriter, request *http.Request) {
	websocketConnection, websocektUpgradeError := manager.upgrader.Upgrade(writer, request, nil)
	clientAddress := websocketConnection.RemoteAddr()

	if websocektUpgradeError != nil {
		log.Panicf("[%s] [ERROR] Failed to establish websocket channel: %\n", clientAddress, websocektUpgradeError)
		return
	}

	defer websocketConnection.Close()

	client := NewClient(websocketConnection)
	if manager.IsClientRegistered(client) {
		log.Panicf("[%s] [ERROR] A connection with this ip address already exists... exiting\n", clientAddress)
		return
	}

	manager.RegisterClient(client)
	defer func() {
		log.Printf("[%s] Client disconnected. Cleaning up resources\n", client.IPAddress)
		manager.DisconnectClient(client)
		manager.UnregisterClient(client)
	}()

	log.Printf("[%s] [LOG] Established connection\n", websocketConnection.RemoteAddr())

	for {
		if !manager.IsClientRegistered(client) {
			break
		}

		clientRequest, errorGetClientRequest := client.GetClientRequest()
		if errorGetClientRequest != nil {
			break
		}

		log.Printf("[%s] [LOG] [%s] Handling Request: %s\n", client.IPAddress, clientRequest.ActionType,  clientRequest.Action)
		userActionHandler, foundHandler := manager.clientRequestHandlers[clientRequest.ActionType]

		if !foundHandler {
			log.Printf("[%s] [ERROR] [%s] Handler for requested action does not exist.\n", client.IPAddress, clientRequest.ActionType)
			continue
		}

		userActionHandler(client, manager, clientRequest.Action)
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

func (manager *Manager) setupUserActionHandlers() {
	manager.clientRequestHandlers[ClientActionTypeHostRoom] = HostRoomHandler
	manager.clientRequestHandlers[ClientActionTypeJoinRoom] = JoinRoomHandler
	manager.clientRequestHandlers[ClientActionTypeDisconnectRoom] = DisconnectRoomHandler
	manager.clientRequestHandlers[ClientActionTypeSendReflection] = ReflectRoomHandler
}
