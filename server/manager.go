package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/cowatch/logger"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Manager struct {
	upgrader websocket.Upgrader

	publicToPrivateTokens map[PublicToken]PrivateToken
	clients map[PrivateToken]*Client

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
		publicToPrivateTokens:	make(map[PublicToken]PrivateToken),
		clients:				make(map[PrivateToken]*Client),
		activeRooms:			make(map[RoomID]*Room),
		clientRequestHandlers:	make(map[ClientRequestType]ClientRequestHandler),
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

	defer websocketConnection.Close()

	client := NewClient(websocketConnection)
	logger.Info("[%s] Established connection\n", websocketConnection.RemoteAddr())
	for {
		clientRequest, errorGetClientRequest := client.GetClientRequest()
		if errorGetClientRequest != nil {
			break
		}

		client.LatestReply = time.Now()

		logger.Info("[%s] [%s] Handling Request: %s\n", client.IPAddress, clientRequest.ActionType,  clientRequest.Action)
		clientActionHandler, foundHandler := manager.clientRequestHandlers[clientRequest.ActionType]

		if !foundHandler {
			logger.Info("[%s] [%s] Handler for requested action does not exist\n", client.IPAddress, clientRequest.ActionType)
			continue
		}

		if 
			manager.IsClientRegistered(client) == false &&
			clientRequest.ActionType != ClientActionTypeAuthorize &&
			clientRequest.ActionType != ClientActionTypePing {

			logger.Info("[%s] [%s] User not authorized\n", client.IPAddress, clientRequest.ActionType)
			continue
		}

		clientActionHandler(client, manager, clientRequest.Action)
	}
}

func (manager *Manager) CleanupInnactiveClients() {
	logger.Info("Cleaning up clients\n")

	currentDate := time.Now()
	for _, client := range(manager.clients) {
		oldNewDifferenceDuration := currentDate.Sub(client.LatestReply)
		oldNewDifference := time.Time{}.Add(oldNewDifferenceDuration)
		disconnectThresholdDuration, _ := time.ParseDuration(ClientInnactivityThreshold + "s")

		disconnectThreshold := time.Time{}.Add(disconnectThresholdDuration)
		if oldNewDifference.Compare(disconnectThreshold) == -1 {
			continue
		}

		logger.Info("Removing innactive client: %s\n", client.IPAddress)
		manager.DisconnectClient(client)
		manager.UnregisterClient(client)
	}
}

type PrivateToken string
type PublicToken string

func (manager *Manager) GenerateUniqueClientTokens() (PrivateToken, PublicToken) {
	privateToken, _ := uuid.NewRandom()
	publicToken, _ := uuid.NewRandom()

	bytePrivateToken, _ := privateToken.MarshalText()
	bytePublicToken, _  := publicToken.MarshalText()

	return PrivateToken(bytePrivateToken), PublicToken(bytePublicToken)
}

func (manager *Manager) RegisterClient(client *Client) error {
	if client.PrivateToken == "" || client.PublicToken == "" {
		return errors.New("Client does not have a registered private & public")
	}

	manager.clients[client.PrivateToken] = client
	manager.publicToPrivateTokens[client.PublicToken] = client.PrivateToken
	return nil
}

func (manager *Manager) UnregisterClient(client *Client) {
	delete(manager.publicToPrivateTokens, client.PublicToken)
	delete(manager.clients, client.PrivateToken)
}

func (manager *Manager) IsClientRegistered(client *Client) bool {
	_, exists := manager.clients[client.PrivateToken]
	return exists
}

func (manager *Manager) GetClient(token PrivateToken) (*Client, bool) {
	client, exists := manager.clients[token]
	if !exists {
		return nil, false
	}

	return client, true
}

func (manager *Manager) GetPrivateToken(token PublicToken) (PrivateToken, bool) {
	privateToken, exists := manager.publicToPrivateTokens[token]
	if !exists {
		return "", false
	}

	return privateToken, true
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
	manager.clientRequestHandlers[ClientActionTypeAuthorize] = AuthorizeHandler
	manager.clientRequestHandlers[ClientActionTypeHostRoom] = HostRoomHandler
	manager.clientRequestHandlers[ClientActionTypeJoinRoom] = JoinRoomHandler
	manager.clientRequestHandlers[ClientActionTypeDisconnectRoom] = DisconnectRoomHandler
	manager.clientRequestHandlers[ClientActionTypeSendReflection] = ReflectRoomHandler
	manager.clientRequestHandlers[ClientActionTypeSendVideoDetails] = ReflectDetailsHandler
	manager.clientRequestHandlers[ClientActionTypePing] = PingHandler
}
