package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/cowatch/internal/model"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthGoogle struct {
	authConfig *oauth2.Config
}

func NewAuthGoogle(config AuthConfig) *AuthGoogle {
	authConfig := &oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		RedirectURL:  config.RedirectURL,
		Scopes:       []string{"email", "profile"},
		Endpoint:     google.Endpoint,
	}

	return &AuthGoogle{
		authConfig: authConfig,
	}
}

type AuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

func (a *AuthGoogle) GetAuthRedirect(state string) string {
	return a.authConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (a *AuthGoogle) GetAuthUser(oauthCode string) (*model.User, error) {
	token, err := a.authConfig.Exchange(context.Background(), oauthCode)
	if err != nil {
		return nil, fmt.Errorf("GetAuthUser: %w", err)
	}

	client := a.authConfig.Client(context.Background(), token)
	response, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("GetAuthUser: %w", err)
	}

	bodyStr, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("GetAuthUser: %w", err)
	}

	var googleUser GoogleUser

	err = json.Unmarshal(bodyStr, &googleUser)
	if err != nil {
		return nil, fmt.Errorf("GetAuthUser: %w", err)
	}

	return googleUser.ToUser(), nil
}

type GoogleUser struct {
	Id    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Icon  string `json:"picture"`
}

func (g *GoogleUser) ToUser() *model.User {
	return &model.User{
		Id:        model.PrivateID(uuid.NewString()),
		PublicId:  uuid.NewString(),
		AuthId:    g.Id,
		Email:     g.Email,
		Name:      g.Name,
		Icon:      g.Icon,
		CreatedAt: time.Now().UnixMilli(),
	}
}
