package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

func TestGorillaConnectionManager(t *testing.T) {

	mockClients := []PrivateToken{
		"clientA",
		"clientB",
		"clientC",
		"clientC",
	}

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
