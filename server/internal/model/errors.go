package model

import "errors"

type CowatchError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func CErrAddDetails(e CowatchError, details string) CowatchError {
	return CowatchError{
		Code:    e.Code,
		Message: e.Message,
		Details: e.Details + ": " + details,
	}
}

var (
	CErrAuthMissingAuthorizationHeader = CowatchError{
		Code:    "AUTH_MISSING_AUTH_HEADER",
		Message: "The Authorization header is missing",
		Details: "The user cannot be authenticated without the authorization header",
	}

	CErrAuthFormattingQueryParams = CowatchError{
		Code:    "AUTH_BAD_QUERY_PARAMS",
		Message: "Failed to format query params",
		Details: "The schema of the query parameters doesn't match the expected one",
	}

	CErrAuthMissingCodeParamInCallback = CowatchError{
		Code:    "AUTH_MISSING_CODE_PARAM",
		Message: "Missing code parameter",
		Details: "The callback route didn't receive the code query parameter",
	}

	CErrAuthFailedToGetAuthUser = CowatchError{
		Code:    "AUTH_FAILED_OAUTH",
		Message: "Failed to authenticate user",
		Details: "The oauth process failed",
	}

	CErrAuthFailedToIdentifyProcessWaitingForAuth = CowatchError{
		Code:    "AUTH_FAILED_FINDING_WAITING_CLIENT",
		Message: "Failed to authenticate user",
		Details: "Process id isn't associated with any listener",
	}

	CErrAuthUserNotFound = CowatchError{
		Code:    "AUTH_USER_NOT_FOUND",
		Message: "Could not find user with the specified credential",
	}

	CErrWebsocketUpgrade = CowatchError{
		Code:    "WS_FAILED_TO_UPGRADE",
		Message: "Failed to establish websocket communication",
		Details: "The websocket upgrade process failed with the error",
	}

	CErrRoomFailedToInitialize = CowatchError{
		Code:    "ROOM_FAILED_TO_INIT",
		Message: "Failed to create a new room",
		Details: "The room failed to start",
	}

	CErrRoomDoesNotExist = CowatchError{
		Code:    "ROOM_NOT_EXISTS",
		Message: "Room does not exist",
	}
)

var (
	ErrNoAuthService = errors.New("No Auth Service speicified")
	ErrNoAuthRepo    = errors.New("No Auth Repo speicified")
	ErrNoAuthRelay   = errors.New("No Auth Relay speicified")
	ErrNoUserRepo    = errors.New("No User Repo speicified")

	ErrUserAlreadyRegistered = errors.New("User is already registered")

	ErrNoRoomOwnerDefined = errors.New("No room owner defined")
	ErrNoWatcher          = errors.New("Watcher does not exist")
)
