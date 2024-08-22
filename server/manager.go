package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/cowatch/logger"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// PrivateToken is the primary identifier of a client.
//
// It isn't used in every request rather we use it to fingerprint an already existing
// connection to it's information and state upon re-logging in our system.
// A PrivateToken is generated using the [Manager.GenerateUniqueClientTokens].
type PrivateToken string

// PublicToken is the identifier of a client in regards to other clients.
//
// It is used as the primary identifier for other clients to interact with a client.
// A PublicToken is generated using the [Manager.GenerateUniqueClientTokens].
type PublicToken string

// Connection is responsible of handling the communication between the server and connection.
type Connection interface {

	// Get's public address of connection
	GetAddr() string

	// ReadMessage collects the next message from the connection and respons to the server.
	ReadMessage() (ClientMessage, error)

	// WriteMessage accepts an arbitrary json object and forwards it to the connection.
	WriteMessage(interface{}) error
}

// ConnectionManger manages all incoming connections.
//
// It abstracts the idea of a connection from the client manager to separate the concern
// between the client representation and their connection. The primary mechanism of identifying
// user resources is the [PrivateToken] thus it's expected for a client to be assigned one before
// the token is registered.
type ConnectionManager interface {

	// NewConnection upgrades a normal HTTP connection to a Websocket connection.
	// It handles all the necessary steps for the handshake to be complete.
	NewConnection(w http.ResponseWriter, r *http.Request) (Connection, error)

	// RegisterClientConnection stores the client connection.
	//
	// An already registered clientToken will replace the existing connection. It is assumed
	// in that case that the connection has been reopened after a disconnection.
	RegisterClientConnection(clientToken PrivateToken, connection *Connection)

	// UnregisterClientConnection will remove the existing connection from our data.
	UnregisterClientConnection(clientToken PrivateToken) error

	// GetConnection get's the connection based on the clientToken.
	GetConnection(clientToken PrivateToken) (*Connection, error)
}

type Manager struct {
	upgrader websocket.Upgrader

	publicToPrivateTokens map[PublicToken]PrivateToken
	clients               map[PrivateToken]*Client

	activeRooms           map[RoomID]*Room
	clientMessageHandlers map[ClientMessageType]ClientRequestHandler
}

func NewManager() *Manager {
	var manager = &Manager{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin:     func(request *http.Request) bool { return true },
		},
		publicToPrivateTokens: make(map[PublicToken]PrivateToken),
		clients:               make(map[PrivateToken]*Client),
		activeRooms:           make(map[RoomID]*Room),
		clientMessageHandlers: make(map[ClientMessageType]ClientRequestHandler),
	}

	manager.setupClientMessageHandlers()
	return manager
}

func (manager *Manager) HandleMessages(writer http.ResponseWriter, request *http.Request) {
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
		clientMessage, errorGetClientMessage := client.GetClientMessage()
		if errorGetClientMessage != nil {
			break
		}

		client.LatestReply = time.Now()

		logger.Info("[%s] [%s] Handling Request: %s\n", client.IPAddress, clientMessage.MessageType, clientMessage.Message)
		clientMessageHandler, foundHandler := manager.clientMessageHandlers[clientMessage.MessageType]

		if !foundHandler {
			logger.Info("[%s] [%s] Handler for message does not exist\n", client.IPAddress, clientMessage.MessageType)
			continue
		}

		if manager.IsClientRegistered(client) == false &&
			clientMessage.MessageType != ClientMessageTypeAuthorize &&
			clientMessage.MessageType != ClientMessageTypePing {

			logger.Info("[%s] [%s] User not authorized\n", client.IPAddress, clientMessage.MessageType)
			continue
		}

		clientMessageHandler(client, manager, clientMessage.Message)
	}
}

func (manager *Manager) CleanupInnactiveClients() {
	logger.Info("Cleaning up clients\n")

	currentDate := time.Now()
	for _, client := range manager.clients {
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

func (manager *Manager) GenerateUniqueClientTokens() (PrivateToken, PublicToken) {
	privateToken, _ := uuid.NewRandom()
	publicToken, _ := uuid.NewRandom()

	bytePrivateToken, _ := privateToken.MarshalText()
	bytePublicToken, _ := publicToken.MarshalText()

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

func (manager *Manager) setupClientMessageHandlers() {
	manager.clientMessageHandlers[ClientMessageTypeAuthorize] = AuthorizeHandler
	manager.clientMessageHandlers[ClientMessageTypeHostRoom] = HostRoomHandler
	manager.clientMessageHandlers[ClientMessageTypeJoinRoom] = JoinRoomHandler
	manager.clientMessageHandlers[ClientMessageTypeDisconnectRoom] = DisconnectRoomHandler
	manager.clientMessageHandlers[ClientMessageTypeSendReflection] = ReflectRoomHandler
	manager.clientMessageHandlers[ClientMessageTypeSendVideoDetails] = ReflectDetailsHandler
	manager.clientMessageHandlers[ClientMessageTypePing] = PingHandler
}
