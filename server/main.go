package main

import (
	"log"
	"net/http"
)

const address = ":8080"

func main() {
	log.Printf("Starting coWATCH on: %s\n", address)

	managerInstance := NewManager()

	// WARN: This is test data must be removed after v0.0.3 (Closed Alpha)
	managerInstance.activeRooms["test"] = &Room{
		RoomID: "test",
		Host: &Client{
			Connection: nil,
			IPAddress: nil,

			Type: ClientTypeHost,
			Name: "Final Boss",
			Image: "https://yt3.ggpht.com/yti/ANjgQV9p6GfGGhyml6eA44zBvSER2q3MjEGVcTgSoRFcuJtxvqw=s88-c-k-c0x00ffffff-no-rj",
			Email:  "",
			RoomID: "test",
		},
		Viewers: make([]*Client, 0, DEFAULT_ROOM_SIZE),
	}

	http.HandleFunc("/reflect", managerInstance.HandleConnection)

	if err := http.ListenAndServe(address, nil) ; err != nil {
		log.Fatalf("Error while serving:\n%s", err);
	}
}
