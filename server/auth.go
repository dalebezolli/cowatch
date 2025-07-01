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
	authConfig       *oauth2.Config
	db               *sql.DB
	authWebsocketHub *AuthWebsocketHub
}

type AuthClient struct {
	token string
	send  chan AuthMessage
}

type AuthWebsocketHub struct {
	connectionManager ConnectionManager
	clients           map[string]*AuthClient
	register          chan *Connection
	unregister        chan *AuthClient
	authenticate      chan AuthMessage
}

type AuthMessage struct {
	Success     bool        `json:"success"`
	ClientToken string      `json:"client"`
	User        *UserPublic `json:"user,omitempty"`
	Error       string      `json:"error,ompitempty"`
}

type User struct {
	Id        string `json:"id"`
	PublicId  string `json:"publicId"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	AuthId    string `json:"authId"`
	CreatedAt int64  `json:"createdAt"`
	IsTester  bool   `json:"isTester"`
}

type UserPublic struct {
	PrivateToken string `json:"privateToken"`
	PublicToken  string `json:"publicToken"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Icon         string `json:"image"`
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

	fmt.Println("Saving user with auth ID: ", u.AuthId)

	_, err = db.Exec(`
		INSERT INTO users (id, publicId, email, name, icon, authId, createdAt, isTester) VALUES (
			?, ?, ?, ?, ?, ?, ?, FALSE
		)
	`, u.Id, u.PublicId, u.Email, u.Name, u.Icon, u.AuthId, u.CreatedAt)

	if err != nil {
		return fmt.Errorf("(%s)InsertToDB - Failed execute insert query %w", u.Email, err)
	}

	return nil
}

func (u *User) ToPublic() *UserPublic {
	return &UserPublic{
		PrivateToken: u.Id,
		PublicToken:  u.PublicId,
		Email:        u.Email,
		Name:         u.Name,
		Icon:         u.Icon,
	}
}

func initializeAuth(config AuthConfig, db *sql.DB) (*AuthService, error) {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS users (
		id STRING PRIMARY KEY NOT NULL,
		publicId STRING NOT NULL,
		createdAt NUMBER,
		email STRING NOT NULL,
		name STRING,
		icon STRING,
		authId STRING NOT NULL,
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

	authWebsocketHub := initializeAuthWebsocketHub(NewGorillaConnectionManager())
	go authWebsocketHub.run()

	return &AuthService{
		authConfig:       authConfig,
		db:               db,
		authWebsocketHub: authWebsocketHub,
	}, nil
}

func (auth *AuthService) handleAuthRoutes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /auth/", auth.routeAuth)
	mux.HandleFunc("GET /auth/callback", auth.routeAuthCallback)
	mux.HandleFunc("GET /auth-await", auth.routeAuthAwait)

	return mux
}

func (auth *AuthService) routeAuth(w http.ResponseWriter, r *http.Request) {
	stateConfig := StateQueryParams{
		ProcessId: uuid.NewString(),
		Action:    StateQueryParamsAction(r.URL.Query().Get("action")),
		ClientID:  r.URL.Query().Get("client"),
	}

	queryParams, _ := formatQueryParams(stateConfig)
	http.Redirect(
		w,
		r,
		auth.authConfig.AuthCodeURL(queryParams, oauth2.AccessTypeOffline),
		http.StatusTemporaryRedirect,
	)
}

type GoogleUser struct {
	Id    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Icon  string `json:"picture"`
}

func (g *GoogleUser) ToUser() *User {
	return &User{
		Id:        uuid.NewString(),
		PublicId:  uuid.NewString(),
		AuthId:    g.Id,
		Email:     g.Email,
		Name:      g.Name,
		Icon:      g.Icon,
		CreatedAt: time.Now().UnixMilli(),
	}
}

func (auth *AuthService) routeAuthCallback(w http.ResponseWriter, r *http.Request) {
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

	logger.Info("[Auth] Signing in with: %+v\n", params)

	if params.Action == StateQueryParamActionJoin {
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

		http.Redirect(w, r, os.Getenv("JOIN_SUCCESS_REDIRECT"), http.StatusPermanentRedirect)
	}

	if params.Action == StateQueryParamActionConnect {
		user := auth.findUserFromAuthID(googleUser.Id)

		logger.Info("[Auth] Collected user %+v from storage\n", user)

		if user == nil {
			auth.authWebsocketHub.authenticate <- AuthMessage{Success: false, ClientToken: params.ClientID, Error: "User does not exist."}
		} else if user.IsTester == false {
			auth.authWebsocketHub.authenticate <- AuthMessage{Success: false, ClientToken: params.ClientID, Error: "You aren't a tester yet"}
		} else {
			auth.authWebsocketHub.authenticate <- AuthMessage{Success: true, ClientToken: params.ClientID, User: user.ToPublic()}
		}

		http.Redirect(w, r, os.Getenv("AUTH_SINK"), http.StatusPermanentRedirect)
	}
}

func (auth *AuthService) routeAuthAwait(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Sec-WebSocket-Key") == "" {
		privateToken := r.URL.Query().Get("token")

		if privateToken == "" {
			w.WriteHeader(401)
			fmt.Fprintln(w, "Unauthorized")
			return
		}

		w.Header().Add("Access-Control-Allow-Origin", "*")

		user := auth.findUserFromPrivateToken(privateToken)

		userDataString, _ := json.Marshal(user.ToPublic())
		fmt.Fprintln(w, string(userDataString))

		return
	}

	connection, errorUpgrading := auth.authWebsocketHub.connectionManager.NewConnection(w, r)
	clientAddress := connection.GetAddr()
	if errorUpgrading != nil {
		logger.Error("[%s] [Auth] - Failed to upgrade to websocket: %s\n", clientAddress, errorUpgrading)
	}

	logger.Info("[%s] [Auth] - Client is preparing to authorize\n", clientAddress)

	auth.authWebsocketHub.register <- &connection
}

func (auth *AuthService) findUserFromPrivateToken(privateToken string) *User {
	row := auth.db.QueryRow("SELECT id, email, name, icon, authId, publicId, createdAt, isTester FROM users WHERE id = ?", privateToken)

	var user User
	err := row.Scan(&user.Id, &user.Email, &user.Name, &user.Icon, &user.AuthId, &user.PublicId, &user.CreatedAt, &user.IsTester)
	if err != nil {
		return nil
	}

	return &user
}

func (auth *AuthService) findUserFromAuthID(authID string) *User {
	row := auth.db.QueryRow("SELECT id, email, name, icon, authId, publicId, createdAt, isTester FROM users WHERE authId = ?", authID)

	var user User
	err := row.Scan(&user.Id, &user.Email, &user.Name, &user.Icon, &user.AuthId, &user.PublicId, &user.CreatedAt, &user.IsTester)
	if err != nil {
		return nil
	}

	return &user
}

type StateQueryParams struct {
	ProcessId string                 `param:"id"`
	Action    StateQueryParamsAction `param:"action"`
	ClientID  string                 `param:"client"`
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

func initializeAuthWebsocketHub(connManager ConnectionManager) *AuthWebsocketHub {
	var manager = &AuthWebsocketHub{
		connectionManager: connManager,
		clients:           make(map[string]*AuthClient),
		register:          make(chan *Connection),
		unregister:        make(chan *AuthClient),
		authenticate:      make(chan AuthMessage),
	}

	return manager
}

func (hub *AuthWebsocketHub) run() {
	logger.Info("[Auth] Initialized auth websocket listener\n")
	for {
		select {
		case connection := <-hub.register:
			userToken := uuid.NewString()
			client := &AuthClient{token: userToken, send: make(chan AuthMessage, 2)}

			client.send <- AuthMessage{Success: true, ClientToken: client.token}

			logger.Info("[Auth] Client(%s) awaiting for login confirmation\n", client.token)

			hub.connectionManager.RegisterClientConnection(Token(userToken), connection)
			hub.clients[client.token] = client
			fmt.Println("User token", client.token, hub.clients[client.token])

			go client.write(hub)

			break
		case client := <-hub.unregister:
			hub.connectionManager.UnregisterClientConnection(Token(client.token))
			delete(hub.clients, client.token)
			break
		case message := <-hub.authenticate:
			client, exists := hub.clients[message.ClientToken]
			fmt.Println("Data: ", message.ClientToken, hub.clients[message.ClientToken])
			logger.Info("[Auth] Does client exist? %t\n", exists)
			if exists == false {
				break
			}

			logger.Info("[Auth] Received message to send %+v\n", message)
			client.send <- message

			break
		}
	}
}

func (client *AuthClient) write(auth *AuthWebsocketHub) {
	connection, exists := auth.connectionManager.GetConnection(Token(client.token))
	if exists == false {
		return
	}

	for {
		message := <-client.send
		(*connection).WriteMessage(message)
	}
}
