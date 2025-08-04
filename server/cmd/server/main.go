package main

import (
	"flag"
	"log"
	"os"

	"github.com/cowatch/internal/http"
	"github.com/cowatch/internal/repository"
	"github.com/cowatch/internal/service"
	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

var serverAddress = flag.String("addr", ":8080", "Address of the server")

func main() {
	flag.Parse()

	if err := godotenv.Load(); err != nil {
		log.Fatalf("main: %s\n", err)
	}

	userRepo, err := repository.NewUserRepo(os.Getenv("SQLITE3_DB"))
	if err != nil {
		log.Fatalf("main: %s\n", err)
	}

	authRepo := repository.NewAuthGoogle(repository.AuthConfig{
		ClientID:     os.Getenv("GOOGLE_AUTH_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_AUTH_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_AUTH_REDIRECT"),
	})

	authRelay := service.NewAuthRelay()
	go authRelay.Run()

	authService, err := service.NewAuthService(authRelay, authRepo, userRepo)
	if err != nil {
		log.Fatalf("main: %s\n", err)
	}

	log.Printf("Starting server at %s\n", *serverAddress)
	server, err := http.NewServer(authService, *serverAddress)

	if err != nil {
		log.Fatalf("main: %s\n", err)
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("main: %s\n", err)
	}
}
