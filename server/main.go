package main

import (
	"flag"
	"net/http"
	"os"
	"time"

	"github.com/cowatch/logger"
)

var port string
var ClientCleanupRoutineInterval int
var ClientInnactivityThreshold string

const EndpointReflect = "/reflect"
const tlsPEM = "server.pem"
const tlsKEY = "server.key"

// Returns true if both TLS files exist
func checkForTLS(pemFile, keyFile string) bool {
	_, errPem := os.ReadFile(pemFile)
	_, errKey := os.ReadFile(keyFile)

	return errPem == nil && errKey == nil
}

func main() {
	flag.StringVar(&port, "p", "8080", "Port that the server will run on")
	flag.StringVar(&ClientInnactivityThreshold, "innactivity-threshold", "600", "The amount of time (sec) a client can be innactive before his session is cleaned up")
	flag.IntVar(&ClientCleanupRoutineInterval, "cleanup-interval", 30, "The amount of time (sec) the client cleanup will take to rerun")
	flag.Parse()

	logFileName := "log_" + time.Now().Format("2006_01_02_15_04_05.000")
	logFile, errorOpeningLogFile := os.OpenFile(logFileName, os.O_APPEND|os.O_CREATE|os.O_RDWR, 0600)

	tlsExists := checkForTLS(tlsPEM, tlsKEY)
	if !tlsExists {
		logger.Error("TLS Encryption files not found. Please check that %q and %q exist.\n", tlsPEM, tlsKEY)
		return
	}

	if errorOpeningLogFile != nil {
		logger.Error("Failed to setup logger: %s\n", errorOpeningLogFile)
	} else {
		logger.Info("Started logging to %s\n", logFileName)
		logger.SetLogFile(logFile)

		defer logFile.Close()
	}

	logger.Info("Starting cowatch in port %s\n", port)

	connectionManager := NewGorillaConnectionManager()
	managerInstance := NewManager(connectionManager)

	http.HandleFunc(EndpointReflect, managerInstance.HandleMessages)

	go func() {
		for {
			time.Sleep(time.Duration(ClientCleanupRoutineInterval) * time.Second)
			managerInstance.CleanupInnactiveClients()
		}
	}()

	// if err := http.ListenAndServeTLS(":"+port, "server.pem", "server.key", nil); err != nil {
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		logger.Error("Failed while serving: %s\n", err)
	}
}
