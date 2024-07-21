package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"

	"github.com/google/uuid"
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
	Connection *websocket.Conn
	IPAddress  IPAddress

	Type   ClientType
	Name   string
	Image  string
	Email  string
	RoomID RoomID
}

type FilteredClientRecord struct {
	Name  string `json:"name"`
	Image string `json:"image"`
}

type RoomRecord struct {
	RoomID  RoomID
	Host    *ClientRecord
	Viewers []*ClientRecord
}

type FilteredRoomRecord struct {
	RoomID  RoomID				   `json:"roomID"`
	Host    FilteredClientRecord   `json:"host"`
	Viewers []FilteredClientRecord `json:"viewers"`
}

type RoomReflection struct {
	ID	   string `json:"id"`
	Title  string `json:"title"`
	Author string `json:"author"`
	State  int    `json:"state"`
	CurrentTime float32 `json:"currentTime"`
	Duration    float32 `json:"duration"`
}

type ClientAction struct {
	ActionType string `json:"actionType"`
	Action	   string `json:"action"`
}

type ClientActionHostRoom FilteredClientRecord

type ClientActionJoinRoom struct {
	Name   string `json:"name"`
	Image  string `json:"image"`
	RoomID RoomID `json:"roomID"`
}

type ServerAction struct {
	ActionType	 string `json:"actionType"`
	Action		 string `json:"action"`
	Status		 string `json:"status"` // Returns 'ok' or 'error'
	ErrorMessage string `json:"errorMessage"` // Populated only if there's an error
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var activeClients map[IPAddress]*ClientRecord
var activeRooms map[RoomID]*RoomRecord

/*
	Caches the client in the activeClients map and sends a response to the client
	If initialization fails, it reutrns false
*/
func initializeClient(connection *websocket.Conn) bool {
	_, exists := activeClients[connection.RemoteAddr()]

	if exists {
		return false
	}

	activeClients[connection.RemoteAddr()] = &ClientRecord{
		Connection: connection,
		IPAddress:	connection.RemoteAddr(),

		Type:	ClientTypeInnactive,
		Name:	"",
		Image:	"",
		Email:	"",
		RoomID: "",
	}

	log.Printf("[%s] Initialized client\n", connection.RemoteAddr())
	return true
}

func filterRoom(room RoomRecord) FilteredRoomRecord {
	var filteredRoom FilteredRoomRecord

	filteredHost := FilteredClientRecord{
		Name: room.Host.Name,
		Image: room.Host.Image,
	}

	filteredViewers := make([]FilteredClientRecord, 0, DEFAULT_ROOM_SIZE)

	for _, viewer := range room.Viewers {
		filteredViewers = append(filteredViewers, FilteredClientRecord{
			Name: viewer.Name,
			Image: viewer.Image,
		})
	}

	filteredRoom = FilteredRoomRecord{
		RoomID: room.RoomID,
		Host: filteredHost,
		Viewers: filteredViewers,
	}

	return filteredRoom
}

func disconnectClient(client IPAddress, deleteUserCallback func (client ClientRecord) bool) bool {
	clientRecord, clientExists := activeClients[client]

	if clientExists == false {
		return false
	}

	roomRecord, roomExists := activeRooms[clientRecord.RoomID]

	if roomExists && clientRecord.Type == ClientTypeHost {
		for _, client := range(roomRecord.Viewers) {
			deleteClient(client.IPAddress, deleteUserCallback)
		}

		delete(activeRooms, roomRecord.RoomID)
	} else if roomExists && clientRecord.Type != ClientTypeHost {
		roomIndex, recordFound := FindInSlice(roomRecord.Viewers, clientRecord, func(a *ClientRecord , b *ClientRecord) bool {
			return a.IPAddress == b.IPAddress
		})

		if recordFound {
			roomRecord.Viewers = RemoveFromSlice(roomRecord.Viewers, roomIndex)
		}
	}

	deleteUserCallback(*clientRecord)

	return true
}

/*
	Deletes a client from the ActiveClients Map
	If he's the host of a room, the room is shutdown as well.
*/
func deleteClient(client IPAddress, deleteUserCallback func (client ClientRecord) bool) bool {
	disconnectClient(client, deleteUserCallback)

	delete(activeClients, client)
	return true
}

/*
	Host a room for the specified client with the appropariate action
*/
func hostRoom(client *ClientRecord, action ClientActionHostRoom) {
	updateClientDetails(client, ClientRecord{ Name: action.Name, Image: action.Image, Type: ClientTypeHost })

	generatedId, _ := uuid.NewRandom()
	byteGeneratedId, _ := generatedId.MarshalText()
	var roomID RoomID
	var roomAlreadyExists = true

	for roomAlreadyExists {
		roomID = RoomID(byteGeneratedId[:8])
		_, roomAlreadyExists = activeRooms[roomID]
	}

	client.RoomID = roomID
	activeRooms[roomID] = &RoomRecord{
		RoomID: roomID,
		Host: client,
		Viewers: make([]*ClientRecord, 0, DEFAULT_ROOM_SIZE),
	}

	log.Printf("[%s] (HostRoom) Created room with id: %s. Sending response to client\n", client.IPAddress, roomID)

	var serverActionHostRoomObject = filterRoom(*activeRooms[roomID])
	serverActionHostRoom, serverActionHostRoomMarshalError := json.Marshal(serverActionHostRoomObject)

	if serverActionHostRoomMarshalError != nil {
		log.Panicf("[%s] [ERROR] (HostRoom) Bad Json definition: %s\n", client.IPAddress, serverActionHostRoomMarshalError)
	}
	
	var serverActionObject = ServerAction{
		ActionType: "HostRoom",
		Action: string(serverActionHostRoom),
		Status: "ok",
		ErrorMessage: "",
	}

	serverAction, serverActionMarshalError := json.Marshal(serverActionObject)

	if serverActionMarshalError != nil {
		log.Panicf("[%s] [ERROR] (HostRoom) Bad Json definition: %s\n", client.IPAddress, serverActionMarshalError)
		return;
	}

	client.Connection.WriteMessage(websocket.TextMessage, serverAction);
}

func joinRoom(client *ClientRecord, action ClientActionJoinRoom) {
	updateClientDetails(client, ClientRecord{ Name: action.Name, Image: action.Image, Type: ClientTypeViewer })

	room, roomExists := activeRooms[action.RoomID]

	if !roomExists {
		log.Printf("[%s] [ERROR] (JoinRoom) No room found with id: %s\n", client.IPAddress, action.RoomID)
		return
	}

	if len(room.Viewers) >= DEFAULT_ROOM_SIZE {
		log.Printf("[%s] [ERROR] (JoinRoom) Not enough space to join room with id: %s\n", client.IPAddress, action.RoomID)
		return
	}

	room.Viewers = append(room.Viewers, client)

	var serverActionHostRoomObject = filterRoom(*room)
	serverActionHostRoom, serverActionHostRoomMarshalError := json.Marshal(serverActionHostRoomObject)

	if serverActionHostRoomMarshalError != nil {
		log.Panicf("[%s] [ERROR] (HostRoom) Bad Json definition: %s\n", client.IPAddress, serverActionHostRoomMarshalError)
	}

	var serverActionObject = ServerAction{
		ActionType: "JoinRoom",
		Action: string(serverActionHostRoom),
		Status: "ok",
		ErrorMessage: "",
	}

	serverAction, serverActionMarshalError := json.Marshal(serverActionObject)

	if serverActionMarshalError != nil {
		log.Panicf("[%s] [ERROR] (HostRoom) Bad Json definition: %s\n", client.IPAddress, serverActionMarshalError)
		return;
	}

	client.Connection.WriteMessage(websocket.TextMessage, serverAction);
}

func disconnectRoom(client *ClientRecord) {
	var serverActionObject = ServerAction{
		ActionType: "DisconnectRoom",
		Action: "",
		Status: "ok",
		ErrorMessage: "",
	}

	serverAction, serverActionMarshalError := json.Marshal(serverActionObject)

	if serverActionMarshalError != nil {
		log.Panicf("[%s] [ERROR] (DisconnectRoom) Bad Json definition: %s\n", client.IPAddress, serverActionMarshalError)
		return;
	}


	didDelete := disconnectClient(client.IPAddress, func(client ClientRecord) bool {
		client.Connection.WriteMessage(websocket.TextMessage, serverAction);
		return true;
	})

	if didDelete == false {
		log.Printf("[%s] [ERROR] (DisconnectRoom) Client couldn't be deleted from server\n", client.IPAddress)
		return
	}

	updateClientDetails(client, ClientRecord{ Type: ClientTypeInnactive })
}

func reflectRoom(client ClientRecord, reflection RoomReflection) {
	if client.Type != ClientTypeHost {
		log.Printf("[%s] [ERROR] (ReflectRoom) User isn't a host\n", client.IPAddress)
		return;
	}

	room, roomExists := activeRooms[client.RoomID]

	if !roomExists {
		log.Printf("[%s] [ERROR] (ReflectRoom) No room found with id: %s\n", client.IPAddress, client.RoomID)
		return
	}

	for _, viewer := range room.Viewers {

		reflection, serverActionMarshalError := json.Marshal(reflection)

		var serverActionObject = ServerAction{
			ActionType: "ReflectRoom",
			Action: string(reflection),
			Status: "ok",
			ErrorMessage: "",
		}

		serverAction, serverActionMarshalError := json.Marshal(serverActionObject)

		if serverActionMarshalError != nil {
			log.Panicf("[%s] [ERROR] (ReflectRoom) Bad Json definition: %s\n", client.IPAddress, serverActionMarshalError)
			return;
		}

		viewer.Connection.WriteMessage(websocket.TextMessage, serverAction)
	}
}

func updateClientDetails(client *ClientRecord, newData ClientRecord) {
	log.Printf("[%s] Updating existing details {%s, %s, %s} with {%s, %s, %s}\n", client.IPAddress, client.Name, client.Image, client.Email, newData.Name, newData.Image, newData.Email);

	if newData.Name != "" {
		client.Name = newData.Name
	}

	if newData.Image != "" {
		client.Image = newData.Image
	}

	if newData.Email != "" {
		client.Email = newData.Email
	}

	client.Type = newData.Type

	log.Printf("[%s] %+v\n", client.IPAddress, client);
}

/*
	Handles all user actions according to spec
	Returns true or false based on the status
*/
func handleUserAction(client *ClientRecord, action ClientAction) bool {
	switch action.ActionType {
	case "HostRoom":
		var parsedAction ClientActionHostRoom
		errParsedAction := json.Unmarshal([]byte(action.Action), &parsedAction)

		if errParsedAction != nil {
			log.Panicf("[%s] [ERROR] (%s) Bad json: %s\n", client.IPAddress, action.ActionType, errParsedAction);
			return false
		}
		
		hostRoom(client, parsedAction)
		break;
	case "JoinRoom":
		var parsedAction ClientActionJoinRoom
		errParsedAction := json.Unmarshal([]byte(action.Action), &parsedAction)

		if errParsedAction != nil {
			log.Panicf("[%s] [ERROR] (%s) Bad json: %s\n", client.IPAddress, action.ActionType, errParsedAction);
			return false
		}

		joinRoom(client, parsedAction)

		break;
	case "DisconnectRoom":
		disconnectRoom(client)
		break;
	case "SendReflection":
		var parsedAction RoomReflection
		errParsedAction := json.Unmarshal([]byte(action.Action), &parsedAction)

		if errParsedAction != nil {
			log.Panicf("[%s] [ERROR] (%s) Bad json: %s\n", client.IPAddress, action.ActionType, errParsedAction);
			return false
		}

		reflectRoom(*client, parsedAction)
	}

	return true;
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

	for {
		_, data, err := connection.ReadMessage()

		if err != nil {
			log.Printf("[%s] [ERROR] Potentially disconnected, cleaning up their connection.\n", connection.RemoteAddr())

			deleteClient(connection.RemoteAddr(), func(client ClientRecord) bool { return true })
			connection.Close()
			return
		}

		var clientAction ClientAction

		unmarshalError := json.Unmarshal(data, &clientAction)

		if unmarshalError != nil {
			log.Printf("[%s] [ERROR] Bad json while parsing client message: %s\n", connection.RemoteAddr(), unmarshalError)
			continue
		}

		log.Printf("[%s] Received (%s) %+v\n", connection.RemoteAddr(), clientAction.ActionType, clientAction.Action)

		client, foundClient := activeClients[connection.RemoteAddr()]
		
		if !foundClient {
			log.Printf("[%s] [ERROR] (%s) No client found.\n", connection.RemoteAddr(), clientAction.ActionType)
			return;
		}

		handleUserAction(client, clientAction)
	}
}

func main() {
	log.Printf("Cowatch starting on: %s\n", address)

	activeClients = make(map[IPAddress]*ClientRecord)
	activeRooms = make(map[RoomID]*RoomRecord)

	activeRooms["test"] = &RoomRecord{
		RoomID: "test",
		Host: &ClientRecord{
			Connection: nil,
			IPAddress: nil,

			Type: ClientTypeHost,
			Name: "Final Boss",
			Image: "https://yt3.ggpht.com/yti/ANjgQV9p6GfGGhyml6eA44zBvSER2q3MjEGVcTgSoRFcuJtxvqw=s88-c-k-c0x00ffffff-no-rj",
			Email:  "",
			RoomID: "test",
		},
		Viewers: make([]*ClientRecord, 0, DEFAULT_ROOM_SIZE),
	}

	http.HandleFunc("/reflect", reflect)

	if err := http.ListenAndServe(address, nil) ; err != nil {
		log.Fatalf("Error while serving:\n%s", err);
	}
}
