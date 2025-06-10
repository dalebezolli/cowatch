package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/cowatch/logger"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthConfig struct {
	clientID     string
	clientSecret string
	redirectURL  string
}

type AuthService struct {
	authConfig *oauth2.Config
}

func initializeAuth(config AuthConfig) (*AuthService, error) {
	authConfig := &oauth2.Config{
		ClientID:     config.clientID,
		ClientSecret: config.clientSecret,
		RedirectURL:  config.redirectURL,
		Scopes:       []string{"email", "profile"},
		Endpoint:     google.Endpoint,
	}

	return &AuthService{
		authConfig: authConfig,
	}, nil
}

func (auth *AuthService) handleAuthRoutes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /auth/", auth.routeAuth())
	mux.HandleFunc("GET /auth/callback", auth.routeAuthCallback())

	return mux
}

func (auth *AuthService) routeAuth() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(
			w,
			r,
			auth.authConfig.AuthCodeURL("", oauth2.AccessTypeOffline),
			http.StatusTemporaryRedirect,
		)
	}
}

func (auth *AuthService) routeAuthCallback() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			logger.Error("Failed to retrieve code for authenticated user")
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT"), http.StatusPermanentRedirect)
			return
		}

		token, err := auth.authConfig.Exchange(context.Background(), code)
		if err != nil {
			logger.Error("Failed to exchange auth code for token")
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT"), http.StatusPermanentRedirect)
			return
		}

		client := auth.authConfig.Client(context.Background(), token)
		response, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
		if err != nil {
			logger.Error("Failed to collect user information")
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT"), http.StatusPermanentRedirect)
			return
		}

		str, err := io.ReadAll(response.Body)
		if err != nil {
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT"), http.StatusPermanentRedirect)
			return
		}

		fmt.Println(string(str))
		http.Redirect(w, r, os.Getenv("JOIN_SUCCESS_REDIRECT"), http.StatusPermanentRedirect)
	}
}
