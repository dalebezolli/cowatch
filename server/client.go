package main

import (
	"encoding/json"
	"errors"
	"net"

	"github.com/cowatch/logger"
	"github.com/gorilla/websocket"
)

type ClientType int

const (
	ClientTypeInnactive = iota
	ClientTypeHost
	ClientTypeViewer
)

type IPAddress net.Addr
type Client struct {
	Connection *websocket.Conn
	IPAddress  IPAddress

	Type   ClientType
	Name   string
	Image  string
	Email  string
	RoomID RoomID
}

type ClientRecord struct {
	Name  string `json:"name"`
	Image string `json:"image"`
}

/*
	Initializes a new Client
*/
func NewClient(clientConnection *websocket.Conn) *Client {
	client := &Client{
		Connection: clientConnection,
		IPAddress:	clientConnection.RemoteAddr(),

		Type:	ClientTypeInnactive,
		Name:	"",
		Image:	"",
		Email:	"",
		RoomID: "",
	}

	return client
}

func (client *Client) GetClientRequest() (ClientAction, error) {
	_, rawMessage, errorReadingMessage := client.Connection.ReadMessage()

	if errorReadingMessage != nil {
		return ClientAction{}, errors.New("Client potentially disconnected")
	}

	var clientActionRequest ClientAction
	unmarshalError := json.Unmarshal(rawMessage, &clientActionRequest)

	if unmarshalError != nil {
		return ClientAction{}, unmarshalError
	}

	return clientActionRequest, nil
}

type ServerMessageType string
const (
	ServerMessageTypeHostRoom = "HostRoom"
	ServerMessageTypeJoinRoom = "JoinRoom"
	ServerMessageTypeUpdateRoom = "UpdateRoom"
	ServerMessageTypeDisconnectRoom = "DisconnectRoom"
	ServerMessageTypeReflectRoom = "ReflectRoom"
)

type ServerMessage struct {
	MessageType		ServerMessageType	`json:"actionType"`
	MessageDetails	json.RawMessage		`json:"action"`
	Status			string				`json:"status"`			// Returns 'ok' or 'error'
	ErrorMessage	string				`json:"errorMessage"`	// Populated only if there's an error
}

func (client *Client) SendMessage(messageType ServerMessageType, messageDetails json.RawMessage, status string, errorMessage string) error {
	var serverMessage = ServerMessage{
		MessageType:	messageType,
		MessageDetails: messageDetails,
		Status:			status,
		ErrorMessage:	errorMessage,
	}

	serverAction, serverActionMarshalError := json.Marshal(serverMessage)

	if serverActionMarshalError != nil {
		return serverActionMarshalError;
	}

	client.Connection.WriteMessage(websocket.TextMessage, serverAction);
	return nil
}

func (client *Client) UpdateClientDetails(newData Client) {
	logger.Info("[%s] Updating existing details {%s, %s, %s} with {%s, %s, %s}\n", client.IPAddress, client.Name, client.Image, client.Email, newData.Name, newData.Image, newData.Email);

	if newData.Name != "" {
		client.Name = newData.Name
	}

	if newData.Image != "" {
		client.Image = newData.Image
	}

	if newData.Email != "" {
		client.Email = newData.Email
	}

	if newData.RoomID != "" {
		client.RoomID = newData.RoomID
	}

	client.Type = newData.Type
}

// Calculates only the necessary data to be sent to a request
func (client *Client) GetFilteredClient() ClientRecord {
	return ClientRecord{
		Name: client.Name,
		Image: client.Image,
	}

}
