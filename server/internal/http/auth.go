package http

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/cowatch/internal/model"
	"github.com/cowatch/internal/repository"
)

type AuthContextKey struct {
	name string
}

func (a *AuthContextKey) String() string { return "cowatch/auth context value " + a.name }

func (s *Server) auth(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Authorization") == "" {
		cErr := model.CErrAddDetails(model.CErrAuthMissingAuthorizationHeader, "missing process-id")
		s.Send(w, nil, &cErr)
		return
	}

	privateId := model.PrivateID(strings.TrimLeft(r.Header.Get("Authorization"), "Bearer "))
	user := s.authService.Authenticate(privateId)
	var err *model.CowatchError = nil
	if user == nil {
		err = &model.CErrAuthUserNotFound
	}

	s.Send(w, user, err)
}

func (s *Server) authRedirectToProvider(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()

	if !queryParams.Has("process-id") {
		cErr := model.CErrAddDetails(model.CErrAuthFormattingQueryParams, "missing process-id")
		s.Send(w, nil, &cErr)
		return
	}

	authState := repository.AuthState{
		ProcessId: repository.ProcessID(queryParams.Get("process-id")),
	}

	strAuthState, err := formatQueryParams(authState)
	if err != nil {
		fmt.Printf("authRedirectToProvider: State couldn't be marshaled %s", err)
		cErr := model.CErrAddDetails(model.CErrAuthFormattingQueryParams, err.Error())
		s.Send(w, nil, &cErr)
		return
	}

	redirectURL, cErr := s.authService.GetAuthRedirect(authState.ProcessId, strAuthState)
	if cErr != nil {
		fmt.Printf("authRedirectToProvider: State couldn't be marshaled %s", cErr.Details)
		s.Send(w, nil, cErr)
		return
	}

	s.Send(w, redirectURL, nil)
}

func (s *Server) authManageResponse(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	code := queryParams.Get("code")
	stateStr := queryParams.Get("state")

	var authState repository.AuthState
	parseQueryParams(stateStr, &authState)

	if code == "" {
		s.Send(w, nil, &model.CErrAuthMissingCodeParamInCallback)
		return
	}

	user, cErr := s.authService.HandleAuthCallback(code, authState)
	s.Send(w, user, cErr)
}

func (s *Server) authConfirmOverWebsocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)

	if err != nil {
		cErr := model.CErrAddDetails(model.CErrWebsocketUpgrade, err.Error())
		s.Send(w, nil, &cErr)
		return
	}

	processID := s.authService.HandleAuthWebsocketInit(conn)
	conn.WriteJSON(ServerMessage{
		Data: processID,
	})
}

func (s *Server) middlewareIsAuthenticated(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") == "" {
			log.Println("Attempted to resolve request but it's missing the authorization header")
			cErr := model.CErrAddDetails(model.CErrAuthMissingAuthorizationHeader, "missing private id")
			w.WriteHeader(http.StatusMethodNotAllowed)
			s.Send(w, nil, &cErr)
			return
		}

		privateId := model.PrivateID(strings.TrimLeft(r.Header.Get("Authorization"), "Bearer "))
		user := s.authService.Authenticate(privateId)
		if user == nil {
			log.Printf("Attempted to resolve request but no user could be found for the key: %s\n", privateId)
			cErr := model.CErrAddDetails(model.CErrAuthFailedToGetAuthUser, "user does not exist")
			w.WriteHeader(http.StatusMethodNotAllowed)
			s.Send(w, nil, &cErr)
			return
		}

		req := r.WithContext(context.WithValue(r.Context(), AuthContextKey{"user"}, user))
		next(w, req)
	}
}
