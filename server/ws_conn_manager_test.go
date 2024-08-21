package main

import (
	"net/http"
	"net/http/httptest"
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
