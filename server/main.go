package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"math/rand"
	"net"
	"net/http"
	"strings"
)

const address = ":8080"

var alnum = [62]byte{'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'}

type PublicToken [6]byte

type Action int

const (
	EstablishConnection Action = iota
)

type ClientMessage struct {
	Action  Action `json:"action"`
	Payload string `json:"payload"`
}

type BasicUser struct {
	Username string `json:"username"`
	UserIcon string `json:"user_image"`
}

type ServerMessage struct {
	Action  Action `json:"action"`
	Status  bool   `json:"status"`
	Payload string `json:"payload"`
}

type Room struct {
	Listeners  map[net.Addr]PublicToken
	Hosts      map[net.Addr]PublicToken
	Reflection Reflection
}

type Client struct {
	Token    PublicToken
	Username string
	UserIcon string
	IsMuted  bool
	Room     string
}

type PingMesage struct {
	Username string `json:"username"`
	UserIcon string `json:"usericon"`
}

type Reflection struct {
	Id          string
	Author      string
	Title       string
	State       int
	CurrentTime float32
	Duration    float32
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func newRandPublicToken() PublicToken {
	var id [6]byte

	for i := 0; i < 6; i++ {
		id[i] = alnum[rand.Intn(62)]
	}

	return id
}

func establishConnection(basicUser BasicUser, connection *websocket.Conn, clients map[net.Addr]Client) error {
	publicToken := newRandPublicToken()
	newClient := Client{
		Token:    publicToken,
		Username: basicUser.Username,
		UserIcon: basicUser.UserIcon,
		IsMuted:  false,
		Room:     "",
	}

	clients[connection.RemoteAddr()] = newClient

	jsonBytes, errorMarshal := json.Marshal(newClient)

	if errorMarshal != nil {
		return errorMarshal
	}

	errorUpdateUser := connection.WriteJSON(ServerMessage{
		Action:  EstablishConnection,
		Status:  true,
		Payload: string(jsonBytes),
	})

	if errorUpdateUser != nil {
		return errorUpdateUser
	}

	fmt.Printf("[%s] Authenticated %s with public token: %s\n", connection.RemoteAddr(), newClient.Username, newClient.Token)

	return nil
}

func handleClientMessage(connection *websocket.Conn, message ClientMessage, clients map[net.Addr]Client) error {
	fmt.Printf("[%s] Handling message %d with %s\n", connection.RemoteAddr(), message.Action, message.Payload)

	switch message.Action {
	case EstablishConnection:
		var basicUser BasicUser

		parseError := json.NewDecoder(strings.NewReader(message.Payload)).Decode(&basicUser)
		if parseError != nil {
			return parseError
		}

		errorEstablishConnection := establishConnection(basicUser, connection, clients)

		if errorEstablishConnection != nil {
			return errorEstablishConnection
		}

		break
	}

	return nil
}

// We'll hold a map of rooms and a map of clients for bidirectional manipulation
// rooms := make(map[string]Room)
var clients = make(map[net.Addr]Client)

func main() {

	http.HandleFunc("/reflect", func(writer http.ResponseWriter, request *http.Request) {
		upgrader.CheckOrigin = func(request *http.Request) bool {
			return true
		}

		connection, error := upgrader.Upgrade(writer, request, nil)

		if error != nil {
			fmt.Printf("[%s] There was an error while creating the Websocket connection: %v\n", connection.RemoteAddr(), error)
			return
		}

		fmt.Printf("[%s] Connected to ws.\n", connection.RemoteAddr())

		for {
			var receivedMessage ClientMessage
			errorParse := connection.ReadJSON(&receivedMessage)

			if errorParse != nil {
				fmt.Printf("[%s] There was an error while reading json: %v\n", connection.RemoteAddr(), errorParse)
			}

			if errorHandle := handleClientMessage(connection, receivedMessage, clients); errorHandle != nil {
				fmt.Printf("[%s] There was an error while handling client message: %v\n", connection.RemoteAddr(), errorParse)
			}
		}

	})

	error := http.ListenAndServe(address, nil)

	if error != nil {
		fmt.Printf("Error while serving: %v\n", error)
	}

	fmt.Print("Server started on port 8080")
}
