// Connection Manager introduces an abstraction layer over the Gorilla Websocket module.
package main

import (
	"errors"
	"net/http"

	"github.com/gorilla/websocket"
)

var ErrConnectionNotExists = errors.New("Connection does not exist")

// Encapsulation of websocket connection from the gorilla module.
type GorillaConnection struct {
	connection *websocket.Conn
}

// Read's next websocket message
func (conn GorillaConnection) ReadMessage() (ClientMessage, error) {
	var message ClientMessage
	err := conn.connection.ReadJSON(&message)
	return message, err
}

// Sends an abstract json to the client
func (conn GorillaConnection) WriteMessage(data interface{}) error {
	conn.connection.WriteJSON(data)
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
	_, ok := connManager.connectionsMap[clientToken]
	if !ok {
		return ErrConnectionNotExists
	}

	delete(connManager.connectionsMap, clientToken)
	return nil
}

// Get's managed client
func (connManager GorillaConnectionManager) GetConnection(clientToken PrivateToken) (*Connection, error) {
	conn, ok := connManager.connectionsMap[clientToken]

	if !ok {
		return nil, ErrConnectionNotExists
	}

	return conn, nil
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
