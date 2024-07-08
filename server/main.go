package main

import (
	"log"
	"net/http"
	"net"
	"github.com/gorilla/websocket"
)

const address = ":8080"

type IPAddress net.Addr
type RoomID string

type ClientType int

const (
	ClientTypeInnactive = iota
	ClientTypeHost
	ClientTypeViewer
)

type ClientRecord struct {
	Type   ClientType
	Name   string
	Image  string
	Email  string
	RoomID RoomID
}

type RoomRecord struct {
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
func initializeClient(connection *websocket.Conn) bool {
	_, exists := activeClients[IPAddress(connection.RemoteAddr())]

	if exists {
		return false
	}

	activeClients[IPAddress(connection.RemoteAddr())] = ClientRecord{
		Type: ClientTypeInnactive,
		Name: "",
		Image: "",
		Email: "",
		RoomID: "",
	}

	log.Printf("[%s] Initialized client\n", connection.RemoteAddr())
	return true
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

	if ok := initializeClient(connection); !ok {
		log.Panicf("[%s] The client is already connected, is this a mistake?\n", connection.RemoteAddr())
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
