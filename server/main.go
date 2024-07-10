package main

import (
	"log"
	"net/http"
	"net"
	"github.com/gorilla/websocket"
)

const address = ":8080"

const DEFAULT_ROOM_SIZE = 10

type IPAddress net.Addr
type RoomID string

type ClientType int

const (
	ClientTypeInnactive = iota
	ClientTypeHost
	ClientTypeViewer
)

type ClientRecord struct {
	IPAddress IPAddress
	Type	  ClientType
	Name	  string
	Image     string
	Email     string
	RoomID    RoomID
}

type RoomRecord struct {
	RoomID  RoomID
	Host    ClientRecord
	Viewers []ClientRecord
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var activeClients map[IPAddress]ClientRecord
var activeRooms map[RoomID]RoomRecord

/*
	Caches the client in the activeClients map and sends a response to the client
	If initialization fails, it reutrns false
*/
func initializeClient(clientIP IPAddress) bool {
	_, exists := activeClients[clientIP]

	if exists {
		return false
	}

	activeClients[clientIP] = ClientRecord{
		IPAddress: clientIP,
		Type: ClientTypeInnactive,
		Name: "",
		Image: "",
		Email: "",
		RoomID: "",
	}

	log.Printf("[%s] Initialized client\n", clientIP)
	return true
}

/*
	Deletes a client from the ActiveClients Map
	If he's the host of a room, the room is shutdown as well.
*/
func deleteClient(client IPAddress) {
	clientRecord, clientExists := activeClients[client]

	if clientExists == false {
		return
	}

	_, roomExists := activeRooms[clientRecord.RoomID]

	if roomExists && clientRecord.Type == ClientTypeHost {
		deleteRoom(clientRecord.RoomID);
	} else if roomExists && clientRecord.Type != ClientTypeHost {
		// TODO: Remvoe client from room
	}

	delete(activeClients, client)
}

/*
	Deletes a room from the ActiveRooms Map
	Deletes any user associated with it as well
*/
func deleteRoom(roomID RoomID) {
	// TODO: Cleanup room
}

func reflect(writer http.ResponseWriter, request *http.Request) {
	upgrader.CheckOrigin = func(request *http.Request) bool {
		return true
	}

	connection, error := upgrader.Upgrade(writer, request, nil)

	log.Printf("[%s] Connected.\n", connection.RemoteAddr())

	if error != nil {
		log.Panicf("[%s] There was an error while creating the Websocket connection: %v\n", connection.RemoteAddr(), error)
		return
	}

	if ok := initializeClient(connection.RemoteAddr()); !ok {
		log.Panicf("[%s] The client is already connected, is this a mistake?\n", connection.RemoteAddr())
	}

	for {
		_, data, err := connection.ReadMessage()

		if err != nil {
			log.Printf("[%s] Potentially disconnected, cleaning up their connection.", connection.RemoteAddr())

			deleteClient(connection.RemoteAddr())
			connection.Close()
			return
		}

		log.Printf("[%s] %s", connection.RemoteAddr(), data)


	}
}

func main() {
	log.Printf("Cowatch starting on: %s\n", address)

	activeClients = make(map[IPAddress]ClientRecord)
	activeRooms = make(map[RoomID]RoomRecord)

	http.HandleFunc("/reflect", reflect)

	if err := http.ListenAndServe(address, nil) ; err != nil {
		log.Fatalf("Error while serving:\n%s", err);
	}
}
