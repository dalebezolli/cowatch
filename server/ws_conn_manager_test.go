package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

func TestGorillaConnectionManager(t *testing.T) {
	t.Run("upgrading http connection to websocket & creation of connection object", func(t *testing.T) {
		gorillaConnectionManager := NewGorillaConnectionManager()

		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			_, err := gorillaConnectionManager.NewConnection(w, r)
			if err != nil {
				t.Errorf("Failed to create a new connection object: %v\n", err)
			}
		})
		defer mockServer.Close()

		ws, err := connectToServer(mockServer)
		if err != nil {
			t.Errorf("Failed to open a ws connection: %v\n", err)
		}

		ws.Close()
	})

	t.Run("registring clients to the connection manager", func(t *testing.T) {
		mockClients := []Token{
			"clientA",
			"clientB",
			"clientC",
			"clientC",
		}

		gorillaConnectionManager := NewGorillaConnectionManager()
		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)
			id := mockClients[len(gorillaConnectionManager.connectionsMap)]

			gorillaConnectionManager.RegisterClientConnection(id, &conn)
		})

		for range mockClients {
			ws, _ := connectToServer(mockServer)
			ws.Close()
		}

		got := len(gorillaConnectionManager.connectionsMap)

		setUniqueClients := make(map[Token]bool)

		for _, mockClientID := range mockClients {
			setUniqueClients[mockClientID] = true
		}

		want := len(setUniqueClients)

		if got != want {
			t.Errorf("Registered \"%d\" when we expected \"%d\" clients\n", got, want)
			return
		}

		for _, mockClientID := range mockClients {
			_, ok := gorillaConnectionManager.connectionsMap[mockClientID]

			if !ok {
				t.Errorf("Client with id %q isn't registered\n", mockClientID)
			}
		}
	})

	t.Run("getting existing connection", func(t *testing.T) {
		mockClients := []Token{
			"clientA",
		}

		gorillaConnectionManager := NewGorillaConnectionManager()
		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)
			id := mockClients[len(gorillaConnectionManager.connectionsMap)]

			gorillaConnectionManager.RegisterClientConnection(id, &conn)
		})

		ws, _ := connectToServer(mockServer)
		defer ws.Close()

		for _, mockClientID := range mockClients {
			_, exists := gorillaConnectionManager.GetConnection(mockClientID)

			if !exists {
				t.Errorf("Client with id %q isn't registered\n", mockClientID)
			}
		}
	})

	t.Run("getting non existing connection", func(t *testing.T) {
		gorillaConnectionManager := NewGorillaConnectionManager()
		_, exists := gorillaConnectionManager.GetConnection("client")

		if exists {
			t.Error("Client is registered when he shouldn't be\n")
		}
	})

	t.Run("getting the correct connection after a reconnection", func(t *testing.T) {
		mockClients := []Token{
			"clientC",
			"clientC",
		}

		allClients := make(map[Token]*Connection)

		gorillaConnectionManager := NewGorillaConnectionManager()
		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)
			id := mockClients[len(gorillaConnectionManager.connectionsMap)]

			gorillaConnectionManager.RegisterClientConnection(id, &conn)
			allClients[id+Token(strconv.Itoa(len(allClients)))] = &conn
		})

		for range mockClients {
			ws, _ := connectToServer(mockServer)
			ws.Close()
		}

		connOld, okOld := allClients[mockClients[0]+"0"]
		connNew, okNew := allClients[mockClients[0]+"1"]

		if !okOld || !okNew {
			t.Errorf("old(%t) or new(%t) does not exist\n", okOld, okNew)
			return
		}

		conn, exists := gorillaConnectionManager.GetConnection("clientC")
		if !exists {
			t.Errorf("Client isn't registered\nList: %v\n", gorillaConnectionManager.connectionsMap)
			return
		}

		if reflect.DeepEqual(conn, connOld) {
			t.Errorf("Client is equal to old Client\nOLD: %v\nGET: %v\n", connOld, conn)
			return
		}

		if !reflect.DeepEqual(conn, connNew) {
			t.Errorf("Client is NOT equal to new Client\nNEW: %v\nGET: %v\n", connNew, conn)
			return
		}
	})

	t.Run("unregistering clients after the connection", func(t *testing.T) {
		const mockID = "clientA"

		gorillaConnectionManager := NewGorillaConnectionManager()
		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)
			gorillaConnectionManager.RegisterClientConnection(mockID, &conn)
		})

		ws, _ := connectToServer(mockServer)
		defer ws.Close()

		err := gorillaConnectionManager.UnregisterClientConnection(mockID)

		if err != nil {
			t.Errorf("Client with id %q couldn't be unregistered: %v\n", mockID, err)
			return
		}

		_, exists := gorillaConnectionManager.GetConnection(mockID)
		if exists {
			t.Errorf("Client with id %q was not unregistered\n", mockID)
		}
	})

	t.Run("unregistering clients that doesn't exist", func(t *testing.T) {
		const mockID = "clientA"

		gorillaConnectionManager := NewGorillaConnectionManager()
		err := gorillaConnectionManager.UnregisterClientConnection(mockID)

		if err == nil {
			t.Errorf("Client with id %q was unregistered when he shouldn't haven", mockID)
		}
	})
}

func TestGorillaConnection(t *testing.T) {
	t.Run("reading data from user", func(t *testing.T) {
		done := make(chan bool)
		gorillaConnectionManager := NewGorillaConnectionManager()

		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)

			_, err := conn.ReadMessage()
			if err != nil {
				t.Errorf("Failed for server to read user message: %v\n", err)
			}
			done <- true
		})

		ws, _ := connectToServer(mockServer)

		err := ws.WriteJSON(ClientMessage{MessageType: "test", Message: "tested"})
		if err != nil {
			t.Errorf("Failed to write message: %v\n", err)
		}

		<-done
	})

	t.Run("recieving data from server", func(t *testing.T) {
		clientMessage := ClientMessage{MessageType: "test", Message: "tested"}

		gorillaConnectionManager := NewGorillaConnectionManager()

		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)

			msg, _ := conn.ReadMessage()
			conn.WriteMessage(msg)
		})

		ws, _ := connectToServer(mockServer)

		err := ws.WriteJSON(clientMessage)
		if err != nil {
			t.Errorf("Failed to write message: %v\n", err)
		}

		_, msg, err := ws.ReadMessage()
		if err != nil {
			t.Errorf("Failed to read message from server: %v\n", err)
		}

		var got ClientMessage
		json.Unmarshal(msg, &got)
		if err != nil {
			t.Errorf("Failed to unmarshal json: %v\n", err)
		}

		if !reflect.DeepEqual(got, clientMessage) {
			t.Errorf("Server didn't return expected details\nGot %v Want %v\n", got, clientMessage)
		}
	})
}

func setupServer(reflectionHandler func(w http.ResponseWriter, r *http.Request)) *httptest.Server {
	router := http.NewServeMux()
	router.HandleFunc(EndpointReflect, reflectionHandler)
	return httptest.NewServer(router)
}

func connectToServer(mockServer *httptest.Server) (*websocket.Conn, error) {
	wsURL := "ws" + strings.TrimPrefix(mockServer.URL, "http") + EndpointReflect
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return nil, err
	}

	return ws, nil
}
