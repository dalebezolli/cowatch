package repository

import "github.com/cowatch/internal/model"

type ProcessID string

type AuthRepository interface {
	GetAuthRedirect(state string) string
	GetAuthUser(oauthCode string) (*model.User, error)
}

type AuthState struct {
	ProcessId ProcessID `param:"id"`
}
