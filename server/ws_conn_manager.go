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

func (conn GorillaConnection) GetAddr() string {
	return conn.connection.RemoteAddr().String()
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
	connectionsMap map[Token]*Connection
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
func (connManager GorillaConnectionManager) RegisterClientConnection(privateToken Token, connection *Connection) {
	connManager.connectionsMap[privateToken] = connection
}

// Unregisters managed client
func (connManager GorillaConnectionManager) UnregisterClientConnection(privateToken Token) error {
	_, ok := connManager.connectionsMap[privateToken]
	if !ok {
		return ErrConnectionNotExists
	}

	delete(connManager.connectionsMap, privateToken)
	return nil
}

// Get's managed client
func (connManager GorillaConnectionManager) GetConnection(privateToken Token) (*Connection, error) {
	conn, ok := connManager.connectionsMap[privateToken]

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
		connectionsMap: make(map[Token]*Connection, 1024),
	}
}
