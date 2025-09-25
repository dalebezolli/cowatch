package http

import (
	"encoding/json"
	"net/http"

	"github.com/cowatch/internal/domain/room"
	"github.com/cowatch/internal/model"
	"github.com/cowatch/internal/service"
	"github.com/gorilla/websocket"
)

type Server struct {
	upgrader *websocket.Upgrader
	mux      *http.ServeMux
	address  string

	certFile string
	keyFile  string

	authService *service.AuthService
	watchers    map[model.PrivateID]*Watcher
	rooms       map[room.RoomID]*room.Room
}

func NewServer(authService *service.AuthService, address string) (*Server, error) {
	if authService == nil {
		return nil, model.ErrNoAuthService
	}

	mux := http.NewServeMux()
	s := Server{
		upgrader: &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024},
		mux:      mux,
		address:  address,

		authService: authService,

		watchers: make(map[model.PrivateID]*Watcher),
		rooms:    make(map[room.RoomID]*room.Room),
	}

	mux.HandleFunc("POST /api/room", s.middlewareIsAuthenticated(s.createRoom))
	mux.HandleFunc("GET /api/room/{roomId}", s.getRoom)
	mux.HandleFunc("/api/connect/{roomId}", s.middlewareIsAuthenticated(s.connectToRoom))

	mux.HandleFunc("GET /api/auth", s.auth)
	mux.HandleFunc("GET /api/auth/redirect", s.authRedirectToProvider)
	mux.HandleFunc("GET /api/auth/callback", s.authManageResponse)
	mux.HandleFunc("/api/auth/init", s.authConfirmOverWebsocket)

	return &s, nil
}

func (s *Server) UseTLS(certFile, keyFile string) *Server {
	s.certFile = certFile
	s.keyFile = keyFile

	return s
}

func (s *Server) ListenAndServe() error {
	if s.certFile != "" && s.keyFile != "" {
		return http.ListenAndServeTLS(s.address, s.certFile, s.keyFile, s.mux)
	} else {
		return http.ListenAndServe(s.address, s.mux)
	}
}

type ServerMessage struct {
	Data  any                 `json:"data"`
	Error *model.CowatchError `json:"error"`
}

func (s *Server) Send(w http.ResponseWriter, data any, error *model.CowatchError) {
	w.Header().Add("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ServerMessage{
		Data:  data,
		Error: error,
	})
}
