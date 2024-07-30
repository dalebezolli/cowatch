package main

import (
	"net/http"
	"os"
	"time"

	"github.com/cowatch/logger"
)

const address = ":8080"

func main() {
	logFileName := "log_" + time.Now().Format("2006_01_02_15_04_05.000")
	logFile, errorOpeningLogFile := os.OpenFile(logFileName, os.O_APPEND|os.O_CREATE|os.O_RDWR, 0600)
	
	if errorOpeningLogFile != nil {
		logger.Error("Failed to setup logger: %s\n", errorOpeningLogFile)
	} else {
		logger.Info("Started logging to %s\n", logFileName)
		logger.SetLogFile(logFile)

		defer logFile.Close()
	}

	logger.Info("Starting cowatch on %s\n", address)

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
		logger.Error("Failed while serving: %s\n", err)
	}
}
