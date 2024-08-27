package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/cowatch/logger"
	"github.com/google/uuid"
)

// Token describes the idea of a Private & Public token.
//
// If used as a PrivateToken, it is the primary identifier of a client.
// It isn't used in every request rather we use it to fingerprint an already existing
// connection to it's information and state upon re-logging in our system.
// A PrivateToken is generated using the [Manager.GenerateUniqueClientTokens].
//
// If used as a PublicToken, it is the identifier of a client in regards to other clients.
// It is used as the primary identifier for other clients to interact with a client.
// A PublicToken is generated using the [Manager.GenerateUniqueClientTokens].
type Token string

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
	RegisterClientConnection(privateToken Token, connection *Connection)

	// UnregisterClientConnection will remove the existing connection from our data.
	UnregisterClientConnection(privateToken Token) error

	// GetConnection get's the connection based on the clientToken.
	GetConnection(privateToken Token) (*Connection, bool)
}

type Manager struct {
	connectionManager     ConnectionManager
	publicToPrivateTokens map[Token]Token
	clients               map[Token]*Client
	activeRooms           map[RoomID]*Room
	clientMessageHandlers map[ClientMessageType]ClientRequestHandler
}

func NewManager(connManager ConnectionManager) *Manager {
	var manager = &Manager{
		connectionManager:     connManager,
		publicToPrivateTokens: make(map[Token]Token),
		clients:               make(map[Token]*Client),
		activeRooms:           make(map[RoomID]*Room),
		clientMessageHandlers: make(map[ClientMessageType]ClientRequestHandler),
	}
	manager.setupClientMessageHandlers()
	return manager
}

func (manager *Manager) HandleMessages(writer http.ResponseWriter, request *http.Request) {
	connection, errorUpgrading := manager.connectionManager.NewConnection(writer, request)
	clientAddress := connection.GetAddr()
	if errorUpgrading != nil {
		logger.Error("[%s] Failed to upgrade to websocket: %s\n", clientAddress, errorUpgrading)
	}

	tempPrivateToken := manager.GenerateToken()
	manager.connectionManager.RegisterClientConnection(tempPrivateToken, &connection)

	client := NewClient(tempPrivateToken)
	logger.Info("[%s] Established connection for %q\n", clientAddress, client.PrivateToken)
	for {
		clientMessage, errorGetClientMessage := connection.ReadMessage()
		if errorGetClientMessage != nil {
			break
		}

		client.LatestReply = time.Now()

		logger.Info("[%s] [%s] Handling Request: %s\n", client.PrivateToken, clientMessage.MessageType, clientMessage.Message)
		clientMessageHandler, foundHandler := manager.clientMessageHandlers[clientMessage.MessageType]

		if !foundHandler {
			logger.Info("[%s] [%s] Handler for message does not exist\n", client.PrivateToken, clientMessage.MessageType)
			continue
		}

		if manager.IsClientRegistered(client) == false &&
			clientMessage.MessageType != ClientMessageTypeAuthorize &&
			clientMessage.MessageType != ClientMessageTypePing {

			logger.Info("[%s] [%s] User not authorized\n", client.PrivateToken, clientMessage.MessageType)
			continue
		}

		serverMessages := clientMessageHandler(client, manager, clientMessage.Message)
		for _, directedMessage := range serverMessages {
			if directedMessage.message.MessageType == "" {
				continue
			}

			connectionToBeSentAMessage, exists := manager.connectionManager.GetConnection(directedMessage.token)
			if !exists {
				logger.Warn("[%s] [%s] Get connection does not exist\n", directedMessage.token, directedMessage.message.MessageType)
				continue
			}

			logger.Info("[%s] [%s] Sending: %q\n", directedMessage.token, directedMessage.message.MessageType, string(directedMessage.message.MessageDetails))
			(*connectionToBeSentAMessage).WriteMessage(directedMessage.message)
		}
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
		manager.disconnectClientFromRoom(client)
		manager.UnregisterClient(client)
	}
}

func (manager *Manager) GenerateToken() Token {
	token, _ := uuid.NewRandom()

	tokenBytes, _ := token.MarshalText()

	return Token(tokenBytes)
}

func (manager *Manager) RegisterClient(client *Client) error {
	if client.PrivateToken == "" {
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

func (manager *Manager) GetClient(privateToken Token) (*Client, bool) {
	client, exists := manager.clients[privateToken]
	if !exists {
		return nil, false
	}

	return client, true
}

func (manager *Manager) GetPrivateToken(publicToken Token) (Token, bool) {
	privateToken, exists := manager.publicToPrivateTokens[publicToken]
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

func (manager *Manager) GetRegisteredRoom(roomID RoomID) (*Room, bool) {
	room, exists := manager.activeRooms[roomID]
	return room, exists
}

// Disconnects a client from a room
// If the client is a Viewer, they are removed from the viewer list
// If the client is a Host, they disconnect every other viewer before closing the connection
func (manager *Manager) disconnectClientFromRoom(client *Client) []DirectedServerMessage {
	if !manager.IsClientRegistered(client) {
		return []DirectedServerMessage{}
	}

	room, exists := manager.GetRegisteredRoom(client.RoomID)
	if !exists {
		return []DirectedServerMessage{}
	}

	serverMessages := make([]DirectedServerMessage, 0, len(room.Viewers)*2+1)

	if client.Type == ClientTypeHost {
		for _, viewer := range room.Viewers {
			serverMessages = append(serverMessages, manager.disconnectClientFromRoom(viewer)...)
		}

		manager.UnregisterRoom(room)
	} else if client.Type == ClientTypeViewer {
		room.RemoveViewer(client)
		serverMessages = append(serverMessages, updateRoomClientsWithLatestChanges(*room)...)
	}

	client.UpdateClientDetails(Client{Type: ClientTypeInnactive, RoomID: ""})
	removeMessage := DirectedServerMessage{
		token: client.PrivateToken,
		message: ServerMessage{
			MessageType:    ServerMessageTypeDisconnectRoom,
			MessageDetails: nil,
			Status:         ServerMessageStatusOk,
			ErrorMessage:   "",
		},
	}
	serverMessages = append(serverMessages, removeMessage)
	return serverMessages
}

func (manager *Manager) setupClientMessageHandlers() {
	manager.clientMessageHandlers[ClientMessageTypeAuthorize] = AuthorizeHandler
	manager.clientMessageHandlers[ClientMessageTypeHostRoom] = HostRoomHandler
	manager.clientMessageHandlers[ClientMessageTypeJoinRoom] = JoinRoomHandler
	manager.clientMessageHandlers[ClientMessageTypeDisconnectRoom] = DisconnectRoomHandler
	// manager.clientMessageHandlers[ClientMessageTypeSendReflection] = ReflectRoomHandler
	// manager.clientMessageHandlers[ClientMessageTypeSendVideoDetails] = ReflectDetailsHandler
	// manager.clientMessageHandlers[ClientMessageTypePing] = PingHandler
}
