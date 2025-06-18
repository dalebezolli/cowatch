package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

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
	db         *sql.DB
}

type User struct {
	Email     string `json:"email"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	AuthId    string `json:"authId"`
	CreatedAt int64  `json:"createdAt"`
	IsTester  bool   `json:"isTester"`
}

var (
	ErrUserAlreadyRegistered = errors.New("User is already registered")
)

func (u *User) InsertToDB(db *sql.DB) error {
	row := db.QueryRow(`
		SELECT email FROM users WHERE email = ?
	`, u.Email)

	var emailCopy string
	err := row.Scan(&emailCopy)
	if err == nil {
		return fmt.Errorf("(%s)InsertToDB - %w", u.Email, ErrUserAlreadyRegistered)
	}

	_, err = db.Exec(`
		INSERT INTO users (email, name, icon, authId, createdAt, isTester) VALUES (
			?, ?, ?, ?, ?, FALSE
		)
	`, u.Email, u.Name, u.Icon, u.AuthId, u.CreatedAt)

	if err != nil {
		return fmt.Errorf("(%s)InsertToDB - Failed execute insert query %w", u.Email, err)
	}

	return nil
}

func initializeAuth(config AuthConfig, db *sql.DB) (*AuthService, error) {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS users (
		email STRING PRIMARY KEY NOT NULL,
		name STRING,
		icon STRING,
		authId STRING NOT NULL,
		createdAt NUMBER,
		isTester BOOLEAN
	)`)

	if err != nil {
		return nil, fmt.Errorf("initializeAuth - Failed to create users table: %w", err)
	}

	authConfig := &oauth2.Config{
		ClientID:     config.clientID,
		ClientSecret: config.clientSecret,
		RedirectURL:  config.redirectURL,
		Scopes:       []string{"email", "profile"},
		Endpoint:     google.Endpoint,
	}

	return &AuthService{
		authConfig: authConfig,
		db:         db,
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
		stateConfig := StateQueryParams{
			ProcessId: uuid.NewString(),
			Action:    StateQueryParamsAction(r.URL.Query().Get("action")),
		}

		queryParams, _ := formatQueryParams(stateConfig)

		http.Redirect(
			w,
			r,
			auth.authConfig.AuthCodeURL(queryParams, oauth2.AccessTypeOffline),
			http.StatusTemporaryRedirect,
		)
	}
}

type GoogleUser struct {
	Id    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Icon  string `json:"picture"`
}

func (g *GoogleUser) ToUser() *User {
	return &User{
		AuthId:    g.Id,
		Email:     g.Email,
		Name:      g.Name,
		Icon:      g.Icon,
		CreatedAt: time.Now().UnixMilli(),
	}
}

func (auth *AuthService) routeAuthCallback() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		stateStr := r.URL.Query().Get("state")

		var params StateQueryParams
		parseQueryParams(stateStr, &params)

		if code == "" {
			logger.Error("[%s] Failed to retrieve code for authenticated user\n", params.ProcessId)
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+params.ProcessId, http.StatusPermanentRedirect)
			return
		}

		token, err := auth.authConfig.Exchange(context.Background(), code)
		if err != nil {
			logger.Error("[%s] Failed to exchange auth code for token: %s\n", params.ProcessId, err.Error())
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+params.ProcessId, http.StatusPermanentRedirect)
			return
		}

		client := auth.authConfig.Client(context.Background(), token)
		response, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
		if err != nil {
			logger.Error("[%s] Failed to collect user information: %s\n", params.ProcessId, err.Error())
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+params.ProcessId, http.StatusPermanentRedirect)
			return
		}

		bodyStr, err := io.ReadAll(response.Body)
		if err != nil {
			logger.Error("[%s] Failed to read user information body: %s\n", params.ProcessId, err.Error())
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+params.ProcessId, http.StatusPermanentRedirect)
			return
		}

		var googleUser GoogleUser

		err = json.Unmarshal(bodyStr, &googleUser)
		if err != nil {
			logger.Error("[%s] Failed to parse user information body: %s\n", params.ProcessId, err.Error())
			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?id="+params.ProcessId, http.StatusPermanentRedirect)
			return
		}

		user := googleUser.ToUser()
		err = user.InsertToDB(auth.db)
		if err != nil {
			logger.Error("[%s] Failed to store user to db: %s\n", params.ProcessId, err.Error())

			callbackParams := CallbackQueryParams{
				ProcessId: params.ProcessId,
				Action:    params.Action,
			}

			if errors.Is(err, ErrUserAlreadyRegistered) {
				callbackParams.Error = ErrUserAlreadyRegistered.Error()
			}

			callbackQueryParams, _ := formatQueryParams(callbackParams)

			http.Redirect(w, r, os.Getenv("JOIN_ERROR_REDIRECT")+"?"+callbackQueryParams, http.StatusPermanentRedirect)
			return
		}

		if params.Action == StateQueryParamActionJoin {
			http.Redirect(w, r, os.Getenv("JOIN_SUCCESS_REDIRECT"), http.StatusPermanentRedirect)
		}

		http.Redirect(w, r, "http://localhost:3000", http.StatusPermanentRedirect)
	}
}

type StateQueryParams struct {
	ProcessId string                 `param:"id"`
	Action    StateQueryParamsAction `param:"action"`
}

type StateQueryParamsAction string

const (
	StateQueryParamActionJoin    = "join"
	StateQueryParamActionConnect = "connect"
)

type CallbackQueryParams struct {
	ProcessId string                 `param:"id"`
	Action    StateQueryParamsAction `param:"action"`
	Error     string                 `param:"err"`
}
