package service

import (
	"log"

	"github.com/cowatch/internal/extra"
	"github.com/cowatch/internal/model"
	"github.com/cowatch/internal/repository"
	"github.com/gorilla/websocket"
)

type AuthService struct {
	repository repository.AuthRepository
	relay      *AuthRelay
	userRepo   *repository.UserRepo
}

func NewAuthService(relay *AuthRelay, authRepo repository.AuthRepository, userRepo *repository.UserRepo) (*AuthService, error) {
	if authRepo == nil {
		return nil, extra.ErrNoAuthRepo
	}

	if relay == nil {
		return nil, extra.ErrNoAuthRelay
	}

	if userRepo == nil {
		return nil, extra.ErrNoUserRepo
	}

	return &AuthService{
		repository: authRepo,
		relay:      relay,
		userRepo:   userRepo,
	}, nil
}

func (a *AuthService) Authenticate(privateID model.PrivateID) *model.User {
	return a.userRepo.GetUserFromPrivateId(privateID)
}

func (a *AuthService) GetAuthRedirect(processId repository.ProcessID, state string) (string, *extra.CowatchError) {
	if !a.relay.DoesListenerExist(processId) {
		return "", &extra.CErrAuthFailedToIdentifyProcessWaitingForAuth
	}

	return a.repository.GetAuthRedirect(state), nil
}

func (a *AuthService) HandleAuthCallback(oauthCode string, authState repository.AuthState) (*model.User, *extra.CowatchError) {
	user, err := a.repository.GetAuthUser(oauthCode)
	if err != nil {
		cErr := extra.CErrAddDetails(extra.CErrAuthFailedToGetAuthUser, err.Error())
		return nil, &cErr
	}

	if storedUser := a.userRepo.GetUserFromAuthID(user.AuthId); storedUser == nil {
		err := a.userRepo.Insert(user)

		if err != nil {
			log.Printf("HandleAuthCallback: Failed to create user %s\n", err)
		}
	} else {
		user.Id = storedUser.Id
		user.PublicId = storedUser.PublicId
	}

	a.relay.BroadcastAuth(repository.ProcessID(authState.ProcessId), user)
	return user, nil
}

func (a *AuthService) HandleAuthWebsocketInit(conn *websocket.Conn) repository.ProcessID {
	return a.relay.RegisterAsListener(conn)
}
