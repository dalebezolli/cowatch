package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"

	"github.com/cowatch/internal/extra"
	"github.com/cowatch/internal/service"
	"github.com/gorilla/websocket"
)

type Server struct {
	authService *service.AuthService
	address     string
	upgrader    *websocket.Upgrader
	mux         *http.ServeMux
}

func NewServer(authService *service.AuthService, address string) (*Server, error) {
	if authService == nil {
		return nil, extra.ErrNoAuthService
	}

	mux := http.NewServeMux()
	s := Server{
		upgrader:    &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024},
		mux:         mux,
		address:     address,
		authService: authService,
	}

	mux.HandleFunc("POST /api/room", s.createRoom)
	mux.HandleFunc("GET /api/room/{roomId}", s.getRoom)
	mux.HandleFunc("GET /api/connect/{roomId}", s.listenRoom)

	mux.HandleFunc("GET /api/auth", s.auth)
	mux.HandleFunc("GET /api/auth/redirect", s.authRedirectToProvider)
	mux.HandleFunc("GET /api/auth/callback", s.authManageResponse)
	mux.HandleFunc("/api/auth/init", s.authConfirmOverWebsocket)

	return &s, nil
}

func (s *Server) ListenAndServe() error {
	return http.ListenAndServe(s.address, s.mux)
}

type ServerMessage struct {
	Data  any                 `json:"data"`
	Error *extra.CowatchError `json:"error"`
}

func (s *Server) Send(w http.ResponseWriter, data any, error *extra.CowatchError) {
	w.Header().Add("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ServerMessage{
		Data:  data,
		Error: error,
	})
}

// Encode a query params object to a string
// Each field must contain the "param" tag to correctly identify it's name
func formatQueryParams(params any) (string, error) {
	reflectParamType := reflect.TypeOf(params)
	reflectParamValues := reflect.ValueOf(params)
	if reflectParamType.Kind() != reflect.Struct {
		return "", fmt.Errorf("Provide a struct of strings")
	}

	paramString := ""
	for i := 0; i < reflectParamType.NumField(); i++ {
		reflectField := reflectParamType.Field(i)
		paramName := reflectField.Tag.Get("param")

		if len(paramName) == 0 {
			paramName = reflectField.Name
		}

		reflectValue := reflectParamValues.FieldByName(reflectField.Name)
		if reflectValue.Kind() != reflect.String {
			return "", fmt.Errorf("Provide a struct of strings")
		}

		paramString += paramName + `=` + reflectValue.String()

		if i != reflectParamType.NumField()-1 {
			paramString += "&"
		}
	}

	return paramString, nil
}

func parseQueryParams(str string, params any) error {
	fieldTagToPos := make(map[string]int)

	reflectParamType := reflect.TypeOf(params)
	reflectParamValue := reflect.ValueOf(params)
	if reflectParamType.Kind() != reflect.Pointer || reflectParamType.Elem().Kind() != reflect.Struct {
		return fmt.Errorf("Provide a pointer to a struct of strings")
	}

	reflectStruct := reflectParamType.Elem()

	for i := 0; i < reflectStruct.NumField(); i++ {
		if reflectStruct.Field(i).Type.Kind() != reflect.String {
			return fmt.Errorf("Provide a pointer to a struct of strings")
		}

		fieldTagToPos[reflectStruct.Field(i).Tag.Get("param")] = i
	}

	bytes := []byte(str)

	var currentKey string
	isParsingKey := true
	itemStart := 0
	for i := 0; i < len(bytes); i++ {
		if isParsingKey && bytes[i] == '=' {
			currentKey = string(bytes[itemStart:i])
			isParsingKey = false
			itemStart = i + 1
		}

		if !isParsingKey && bytes[i] == '&' {
			pos, exists := fieldTagToPos[currentKey]
			if exists {
				reflectParamValue.Elem().Field(pos).SetString(string(bytes[itemStart:i]))
			}

			isParsingKey = true
			itemStart = i + 1
		}
	}

	pos, exists := fieldTagToPos[currentKey]
	if exists {
		reflectParamValue.Elem().Field(pos).SetString(string(bytes[itemStart:len(bytes)]))
	}

	return nil
}
