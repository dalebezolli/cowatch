package main

import (
	"encoding/json"
	"errors"
	"net"
	"time"

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

	PrivateToken PrivateToken
	PublicToken  PublicToken

	Type   ClientType
	Name   string
	Image  string
	Email  string
	RoomID RoomID

	LatestReply time.Time
}

type ClientRecord struct {
	Name  string `json:"name"`
	Image string `json:"image"`
	PublicToken PublicToken `json:"publicToken"`
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

		LatestReply: time.Now(),
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
	ServerMessageTypeAuthorize		= "Authorize"
	ServerMessageTypeHostRoom		= "HostRoom"
	ServerMessageTypeJoinRoom		= "JoinRoom"
	ServerMessageTypeUpdateRoom		= "UpdateRoom"
	ServerMessageTypeDisconnectRoom = "DisconnectRoom"
	ServerMessageTypeReflectRoom	= "ReflectRoom"
	ServerMessageTypeReflectVideoDetails = "ReflectVideoDetails"
	ServerMessageTypePong			= "Pong"
)

type ServerMessageStatus string
const (
	ServerMessageStatusOk	 = "ok"
	ServerMessageStatusError = "error"
)

type ServerErrorMessage string
const (
	ServerErrorMessageInternalServerError = "Internal server error."
	ServerErrorMessageBadJson = "Bad request, please upgrade your extension to a newer version"

	ServerErrorMessageNoRoom = "The room you're trying to join doesn't exist"
	ServerErrorMessageFullRoom = "The room you're trying to join is full"

	ServerErrorMessageClientNotHost = "You're not a host"
)

type ServerMessage struct {
	MessageType		ServerMessageType	`json:"actionType"`
	MessageDetails	json.RawMessage		`json:"action"`
	Status			ServerMessageStatus	`json:"status"`			// Returns 'ok' or 'error'
	ErrorMessage	ServerErrorMessage	`json:"errorMessage"`	// Populated only if there's an error
}

func (client *Client) SendMessage(
	messageType ServerMessageType, messageDetails json.RawMessage,
	status ServerMessageStatus, errorMessage ServerErrorMessage,
) error {
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

	if newData.PrivateToken != "" {
		client.PrivateToken = newData.PrivateToken
	}

	if newData.PublicToken != "" {
		client.PublicToken = newData.PublicToken
	}

	client.Type = newData.Type
}

// Calculates only the necessary data to be sent to a request
func (client *Client) GetFilteredClient() ClientRecord {
	return ClientRecord{
		Name: client.Name,
		Image: client.Image,
		PublicToken: client.PublicToken,
	}
}
