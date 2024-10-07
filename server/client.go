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

	PrivateToken Token
	PublicToken  Token

	Type   ClientType
	Name   string
	Image  string
	Email  string
	RoomID RoomID

	LatestReply time.Time
}

type ClientRecord struct {
	Name        string `json:"name"`
	Image       string `json:"image"`
	PublicToken Token  `json:"publicToken"`
}

/*
Initializes a new Client
*/
func NewClient(privateToken Token) *Client {
	client := &Client{
		Type:   ClientTypeInnactive,
		Name:   "",
		Image:  "",
		Email:  "",
		RoomID: "",

		LatestReply: time.Now(),

		PrivateToken: privateToken,
		PublicToken:  "",
	}

	return client
}

type ClientMessageType string
type ClientMessage struct {
	ServerVersion string            `json:"version"`
	MessageType   ClientMessageType `json:"actionType"`
	Message       string            `json:"action"`
}

type DirectedServerMessage struct {
	token   Token
	message ServerMessage
}

type ClientRequestHandler func(client *Client, manager *Manager, clientAction string) []DirectedServerMessage

const (
	ClientMessageTypeAuthorize        = "Authorize"
	ClientMessageTypeHostRoom         = "HostRoom"
	ClientMessageTypeJoinRoom         = "JoinRoom"
	ClientMessageTypeDisconnectRoom   = "DisconnectRoom"
	ClientMessageTypeSendReflection   = "SendReflection"
	ClientMessageTypeSendVideoDetails = "SendVideoDetails"
	ClientMessageTypePing             = "Ping"
	ClientMessageTypeAttemptReconnect = "AttemptReconnect"
)

func (client *Client) GetClientMessage() (ClientMessage, error) {
	_, rawMessage, errorReadingMessage := client.Connection.ReadMessage()

	if errorReadingMessage != nil {
		return ClientMessage{}, errors.New("Client potentially disconnected")
	}

	var clientMessage ClientMessage
	unmarshalError := json.Unmarshal(rawMessage, &clientMessage)

	if unmarshalError != nil {
		return ClientMessage{}, unmarshalError
	}

	return clientMessage, nil
}

type ServerMessageType string

const (
	ServerMessageTypeAuthorize           = "Authorize"
	ServerMessageTypeHostRoom            = "HostRoom"
	ServerMessageTypeJoinRoom            = "JoinRoom"
	ServerMessageTypeUpdateRoom          = "UpdateRoom"
	ServerMessageTypeDisconnectRoom      = "DisconnectRoom"
	ServerMessageTypeReflectRoom         = "ReflectRoom"
	ServerMessageTypeReflectVideoDetails = "ReflectVideoDetails"
	ServerMessageTypePong                = "Pong"
)

type ServerMessageStatus string

const (
	ServerMessageStatusOk    = "ok"
	ServerMessageStatusError = "error"
)

type ServerErrorMessage string

const (
	ServerErrorMessageOldServerVersion = "Client running older version than expected"

	ServerErrorMessageInternalServerError = "Internal server error."
	ServerErrorMessageBadJson             = "Bad request, please upgrade your extension to a newer version"

	ServerErrorMessageShortRoomName = "The room name must be 3 characters or more."
	ServerErrorMessageLongRoomName  = "The room name must be 50 characters or less."

	ServerErrorMessageNoRoom   = "The room you're trying to join doesn't exist"
	ServerErrorMessageFullRoom = "The room you're trying to join is full"

	ServerErrorMessageClientNotHost = "You're not a host"
)

type ServerMessage struct {
	MessageType    ServerMessageType   `json:"actionType"`
	MessageDetails json.RawMessage     `json:"action"`
	Status         ServerMessageStatus `json:"status"`       // Returns 'ok' or 'error'
	ErrorMessage   ServerErrorMessage  `json:"errorMessage"` // Populated only if there's an error
}

func (client *Client) SendMessage(
	messageType ServerMessageType, messageDetails json.RawMessage,
	status ServerMessageStatus, errorMessage ServerErrorMessage,
) ServerMessage {
	var serverMessage = ServerMessage{
		MessageType:    messageType,
		MessageDetails: messageDetails,
		Status:         status,
		ErrorMessage:   errorMessage,
	}

	return serverMessage
}

func (client *Client) UpdateClientDetails(newData Client) {
	logger.Info("[%s] Updating client details\n\tOld: %+v\n\tNew: %+v\n", client.PrivateToken, client, newData)

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
		Name:        client.Name,
		Image:       client.Image,
		PublicToken: client.PublicToken,
	}
}
