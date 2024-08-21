// Connection Manager introduces an abstraction layer over the Gorilla Websocket module.
package main

import (
	"net/http"

	"github.com/gorilla/websocket"
)

// Encapsulation of websocket connection from the gorilla module.
type GorillaConnection struct {
	connection *websocket.Conn
}

// Read's next websocket message
func (conn GorillaConnection) ReadMessage() (ClientMessage, error) {
	return ClientMessage{}, nil
}

// Sends an abstract json to the client
func (conn GorillaConnection) WriteMessage(interface{}) error {
	return nil
}

// Manager for GorillaConnections.
type GorillaConnectionManager struct {
	upgrader       websocket.Upgrader
	connectionsMap map[PrivateToken]*Connection
}

// Upgrade logic for a HTTP to a long-term TCP connection.
func (connManager GorillaConnectionManager) NewConnection(w http.ResponseWriter, r *http.Request) (Connection, error) {
	websocketConnection, err := connManager.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil, err
	}

	connection := GorillaConnection{
		connection: websocketConnection,
	}

	return connection, nil
}

// Registers client to be managed. If an id is equal with an existing one, the connection will replace the original.
func (connManager GorillaConnectionManager) RegisterClientConnection(clientToken PrivateToken, connection *Connection) {
	connManager.connectionsMap[clientToken] = connection
}

// Unregisters managed client
func (connManager GorillaConnectionManager) UnregisterClientConnection(clientToken PrivateToken) error {
	return nil
}

// Get's managed client
func (connManager GorillaConnectionManager) GetConnection(clientToken PrivateToken) error {
	return nil
}

func NewGorillaConnectionManager() GorillaConnectionManager {
	return GorillaConnectionManager{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin:     func(request *http.Request) bool { return true },
		},
		connectionsMap: make(map[PrivateToken]*Connection, 1024),
	}
}
