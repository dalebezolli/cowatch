package main

import (
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

		err := connectToServer(mockServer)
		if err != nil {
			t.Errorf("Failed to open a ws connection: %v\n", err)
		}
	})

	t.Run("registring clients to the connection manager", func(t *testing.T) {
		mockClients := []PrivateToken{
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
			connectToServer(mockServer)
		}

		got := len(gorillaConnectionManager.connectionsMap)

		setUniqueClients := make(map[PrivateToken]bool)

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
		mockClients := []PrivateToken{
			"clientA",
		}

		gorillaConnectionManager := NewGorillaConnectionManager()
		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)
			id := mockClients[len(gorillaConnectionManager.connectionsMap)]

			gorillaConnectionManager.RegisterClientConnection(id, &conn)
		})

		connectToServer(mockServer)

		for _, mockClientID := range mockClients {
			_, err := gorillaConnectionManager.GetConnection(mockClientID)

			if err != nil {
				t.Errorf("Client with id %q isn't registered\n", mockClientID)
			}
		}
	})

	t.Run("getting non existing connection", func(t *testing.T) {
		gorillaConnectionManager := NewGorillaConnectionManager()
		_, err := gorillaConnectionManager.GetConnection("client")

		if err == nil {
			t.Error("Client is registered when he shouldn't be\n")
		}
	})

	t.Run("getting the correct connection after a reconnection", func(t *testing.T) {
		mockClients := []PrivateToken{
			"clientC",
			"clientC",
		}

		allClients := make(map[PrivateToken]*Connection)

		gorillaConnectionManager := NewGorillaConnectionManager()
		mockServer := setupServer(func(w http.ResponseWriter, r *http.Request) {
			conn, _ := gorillaConnectionManager.NewConnection(w, r)
			id := mockClients[len(gorillaConnectionManager.connectionsMap)]

			gorillaConnectionManager.RegisterClientConnection(id, &conn)
			allClients[id + PrivateToken(strconv.Itoa(len(allClients)))] = &conn
		})

		for range mockClients {
			connectToServer(mockServer)
		}

		connOld, okOld := allClients[mockClients[0] + "0"]
		connNew, okNew := allClients[mockClients[0] + "1"]

		if !okOld || !okNew {
			t.Errorf("old(%t) or new(%t) does not exist\n", okOld, okNew)
			return
		}

		conn, err := gorillaConnectionManager.GetConnection("clientC")
		if err != nil {
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
}

func setupServer(reflectionHandler func(w http.ResponseWriter, r *http.Request)) *httptest.Server {
	router := http.NewServeMux()
	router.HandleFunc(EndpointReflect, reflectionHandler)
	return httptest.NewServer(router)
}

func connectToServer(mockServer *httptest.Server) error {
	wsURL := "ws" + strings.TrimPrefix(mockServer.URL, "http") + EndpointReflect
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return err
	}

	defer ws.Close()
	return nil
}
