package http

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/cowatch/internal/extra"
	"github.com/cowatch/internal/model"
	"github.com/cowatch/internal/repository"
)

func (s *Server) auth(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Authorization") == "" {
		cErr := extra.CErrAddDetails(extra.CErrAuthMissingAuthorizationHeader, "missing process-id")
		s.Send(w, nil, &cErr)
		return
	}

	privateId := model.PrivateID(strings.TrimLeft(r.Header.Get("Authorization"), "Bearer "))
	user := s.authService.Authenticate(privateId)
	var err *extra.CowatchError = nil
	if user == nil {
		err = &extra.CErrAuthUserNotFound
	}

	s.Send(w, user, err)
}

func (s *Server) authRedirectToProvider(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()

	if !queryParams.Has("process-id") {
		cErr := extra.CErrAddDetails(extra.CErrAuthFormattingQueryParams, "missing process-id")
		s.Send(w, nil, &cErr)
		return
	}

	authState := repository.AuthState{
		ProcessId: repository.ProcessID(queryParams.Get("process-id")),
	}

	strAuthState, err := formatQueryParams(authState)
	if err != nil {
		fmt.Printf("authRedirectToProvider: State couldn't be marshaled %s", err)
		cErr := extra.CErrAddDetails(extra.CErrAuthFormattingQueryParams, err.Error())
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
		s.Send(w, nil, &extra.CErrAuthMissingCodeParamInCallback)
		return
	}

	user, cErr := s.authService.HandleAuthCallback(code, authState)
	s.Send(w, user, cErr)
}

func (s *Server) authConfirmOverWebsocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)

	if err != nil {
		cErr := extra.CErrAddDetails(extra.CErrWebsocketUpgrade, err.Error())
		s.Send(w, nil, &cErr)
		return
	}

	processID := s.authService.HandleAuthWebsocketInit(conn)
	conn.WriteJSON(ServerMessage{
		Data: processID,
	})
}
