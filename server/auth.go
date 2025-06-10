package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/cowatch/logger"
	"github.com/google/uuid"
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
	processID, _ := uuid.NewRandom()

	return func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(
			w,
			r,
			auth.authConfig.AuthCodeURL(formatStateString(StateConfig{
				ProcessId: processID.String(),
			}), oauth2.AccessTypeOffline),
			http.StatusTemporaryRedirect,
		)
	}
}

func (auth *AuthService) routeAuthCallback() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		state := r.URL.Query().Get("state")
		stateConfig := parseStateString(state)

		if code == "" {
			logger.Error("[%s] Failed to retrieve code for authenticated user", stateConfig.ProcessId)
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+stateConfig.ProcessId, http.StatusPermanentRedirect)
			return
		}

		token, err := auth.authConfig.Exchange(context.Background(), code)
		if err != nil {
			logger.Error("[%s] Failed to exchange auth code for token: %s", stateConfig.ProcessId, err.Error())
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+stateConfig.ProcessId, http.StatusPermanentRedirect)
			return
		}

		client := auth.authConfig.Client(context.Background(), token)
		response, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
		if err != nil {
			logger.Error("[%s] Failed to collect user information: %s", stateConfig.ProcessId, err.Error())
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+stateConfig.ProcessId, http.StatusPermanentRedirect)
			return
		}

		str, err := io.ReadAll(response.Body)
		if err != nil {
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+stateConfig.ProcessId, http.StatusPermanentRedirect)
			return
		}

		fmt.Println(string(str))
		http.Redirect(w, r, os.Getenv("JOIN_SUCCESS_REDIRECT"), http.StatusPermanentRedirect)
	}
}

type StateConfig struct {
	ProcessId string
}

func formatStateString(config StateConfig) string {
	return "id:" + config.ProcessId
}

func parseStateString(str string) *StateConfig {
	id := strings.Trim(str, "id:")

	return &StateConfig{
		ProcessId: id,
	}
}
