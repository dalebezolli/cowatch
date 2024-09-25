package main

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/cowatch/logger"
)

type ClientRequestAuthorizeRoom struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	PrivateToken Token  `json:"privateToken"`
}

type ServerResponseAuthorizeRoom struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	PrivateToken Token  `json:"privateToken"`
	PublicToken  Token  `json:"publicToken"`
}

func AuthorizeHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	logger.Info("[%s] [Authorize] Autorizing client\n", client.PrivateToken)
	var requestAuthorize ClientRequestAuthorizeRoom

	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &requestAuthorize)
	if errorParsingRequest != nil {
		logger.Warn("[%s] [Authorize] User sent wrong json: %s\n", client.PrivateToken, errorParsingRequest)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeAuthorize,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageBadJson,
				},
			},
		}
	}

	var clientDetails Client
	var isClientAuthorized bool
	if requestAuthorize.PrivateToken != "" {
		existingClient, exists := manager.GetClient(requestAuthorize.PrivateToken)
		logger.Info("[%s] [Authorize] Does previous user id (%s) exist? %t\n", client.PrivateToken, requestAuthorize.PrivateToken, exists)
		if exists {
			logger.Info("[%s] [Authorize] Collecting existing user's details %q\n", client.PrivateToken, existingClient.PrivateToken)
			clientDetails = *existingClient
			isClientAuthorized = true
		}
	}

	if !isClientAuthorized {
		clientDetails = Client{
			Name:  requestAuthorize.Name,
			Image: requestAuthorize.Image,
			Type:  ClientTypeInnactive,
		}
	}

	clientDetails.PublicToken = manager.GenerateToken()

	if isClientAuthorized {
		logger.Info("[%s] [Authorize] Unregistering previous client\n", client.PrivateToken)
		manager.UnregisterClient(client)

		newConnection, connectionExists := manager.connectionManager.GetConnection(client.PrivateToken)

		if !connectionExists {
			logger.Error("[%s] [Authorize] Failed to collect already registered client connection\n", client.PrivateToken)
			return []DirectedServerMessage{
				{
					token: client.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeAuthorize,
						MessageDetails: nil,
						Status:         ServerMessageStatusError,
						ErrorMessage:   ServerErrorMessageInternalServerError,
					},
				},
			}
		}

		manager.connectionManager.RegisterClientConnection(requestAuthorize.PrivateToken, newConnection)
		manager.UnregisterClient(client)

		errorUnregisteringClient := manager.connectionManager.UnregisterClientConnection(client.PrivateToken)
		if errorUnregisteringClient != nil {
			logger.Error("[%s] [Authorize] Failed to unregister temporary connection id: %s\n", client.PrivateToken, errorUnregisteringClient)
		}
	}

	client.UpdateClientDetails(clientDetails)
	manager.RegisterClient(client)

	serverMessageAuthorize, serverMessageAuthorizeMarshalError := json.Marshal(ServerResponseAuthorizeRoom{
		Name:         client.Name,
		Image:        client.Image,
		PrivateToken: client.PrivateToken,
		PublicToken:  client.PublicToken,
	})

	if serverMessageAuthorizeMarshalError != nil {
		logger.Error("[%s] [Authorize] Failed to marshal host room response: %s\n", client.PrivateToken, serverMessageAuthorizeMarshalError)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeAuthorize,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageInternalServerError,
				},
			},
		}
	}

	return []DirectedServerMessage{
		{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeAuthorize,
				MessageDetails: serverMessageAuthorize,
				Status:         ServerMessageStatusOk,
				ErrorMessage:   "",
			},
		},
	}
}

func AttemptReconnectionHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	if client.RoomID == "" || client.Type == ClientTypeInnactive {
		return []DirectedServerMessage{}
	}

	_, roomExists := manager.GetRegisteredRoom(client.RoomID)
	if !roomExists {
		return []DirectedServerMessage{}
	}

	requestJoinRoom, marshalError := json.Marshal(ClientRequestJoinRoom{
		RoomID: client.RoomID,
	})

	if marshalError != nil {
		logger.Error("[%s] [AttemptReconnectionHandler] Failed to marshal json: %s\n", client.PrivateToken, marshalError)
		return []DirectedServerMessage{}
	}

	return JoinRoomHandler(client, manager, string(requestJoinRoom))
}

func HostRoomHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	serverResponses := make([]DirectedServerMessage, 0, 1)

	var requestRoomSettings RoomSettings
	errorParsingMessage := json.Unmarshal([]byte(clientRequest), &requestRoomSettings)
	if errorParsingMessage != nil {
		logger.Error("[%s] [HostRoom] Client sent bad json object: %s\n", client.PrivateToken, errorParsingMessage)
		serverResponses = append(serverResponses, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeHostRoom,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageBadJson,
			},
		})

		return serverResponses
	}

	if client == nil || manager == nil {
		logger.Error("[Unspecified] [HostRoom] Failed to specify a client or manager for the current host room handler.\n")
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageInternalServerError,
				},
			},
		}
	}

	if client.RoomID != "" {
		serverResponses = append(serverResponses, manager.disconnectClientFromRoom(client)...)
	}

	requestRoomSettings.Name = strings.Trim(requestRoomSettings.Name, " ")
	if len(requestRoomSettings.Name) < 3 {
		logger.Warn("[%s] [HostRoom] Expected room name to be > 3 chars but got %q %d\n", client.PrivateToken, requestRoomSettings.Name, len(requestRoomSettings.Name))
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageShortRoomName,
				},
			},
		}
	}

	if len(requestRoomSettings.Name) > 50 {
		logger.Warn("[%s] [HostRoom] Expected room name to be < 50 chars but got %q %d\n", client.PrivateToken, requestRoomSettings.Name, len(requestRoomSettings.Name))
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageLongRoomName,
				},
			},
		}
	}

	if len(requestRoomSettings.Name) == 0 {
		logger.Warn("[%s] [HostRoom] Expected room name to be > 3 chars but got %q %d\n", client.PrivateToken, requestRoomSettings.Name, len(requestRoomSettings.Name))
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageLongRoomName,
				},
			},
		}
	}

	room, errNewRoom := NewRoom(manager.GenerateUniqueRoomID(), client, requestRoomSettings)
	if errNewRoom != nil {
		logger.Error("[%s] [HostRoom] Failed to create a room: %s\n", client.PrivateToken, errNewRoom)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageInternalServerError,
				},
			},
		}
	}

	manager.RegisterRoom(room)
	logger.Info("[%s] [HostRoom] Created room with id: %s\n", client.PrivateToken, room.RoomID)

	client.UpdateClientDetails(Client{Type: ClientTypeHost, RoomID: room.RoomID})
	filteredRoom := room.GetFilteredRoom()
	serverMessageHostRoom, serverMessageHostRoomMarshalError := json.Marshal(filteredRoom)

	if serverMessageHostRoomMarshalError != nil {
		logger.Error("[%s] [HostRoom] Failed to marshal host room response: %s\n", client.PrivateToken, serverMessageHostRoomMarshalError)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageInternalServerError,
				},
			},
		}
	}

	serverResponses = append(serverResponses, DirectedServerMessage{
		token: client.PrivateToken,
		message: ServerMessage{
			MessageType:    ServerMessageTypeHostRoom,
			MessageDetails: serverMessageHostRoom,
			Status:         ServerMessageStatusOk,
			ErrorMessage:   "",
		},
	})

	return serverResponses
}

type ClientRequestJoinRoom struct {
	RoomID RoomID `json:"roomID"`
}

func JoinRoomHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	serverResponses := make([]DirectedServerMessage, 0, 10)

	var requestJoinRoom ClientRequestJoinRoom
	errorParsingMessage := json.Unmarshal([]byte(clientRequest), &requestJoinRoom)
	if errorParsingMessage != nil {
		logger.Error("[%s] [JoinRoom] Client sent bad json object: %s\n", client.PrivateToken, errorParsingMessage)
		serverResponses = append(serverResponses, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeJoinRoom,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageBadJson,
			},
		})

		return serverResponses
	}

	room, exists := manager.GetRegisteredRoom(requestJoinRoom.RoomID)
	if !exists {
		logger.Info("[%s] [JoinRoom] No room found with id: %s\n", client.PrivateToken, requestJoinRoom.RoomID)
		serverResponses = append(serverResponses, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeJoinRoom,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageNoRoom,
			},
		})

		return serverResponses
	}

	if len(room.Viewers) >= DEFAULT_ROOM_SIZE {
		logger.Info("[%s] [JoinRoom] Not enough space to join room with id: %s\n", client.PrivateToken, requestJoinRoom.RoomID)
		serverResponses = append(serverResponses, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeJoinRoom,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageFullRoom,
			},
		})

		return serverResponses
	}

	if client.Type == ClientTypeHost {
		room.Host = client
	}

	if client.Type == ClientTypeViewer {
		for _, possibleOldClient := range room.Viewers {
			if client.PrivateToken == possibleOldClient.PrivateToken {
				room.RemoveViewer(possibleOldClient)
			}
		}
	}

	if client.Type == ClientTypeInnactive || client.Type == ClientTypeViewer {
		client.Type = ClientTypeViewer
		room.AddViewer(client)
	}

	client.UpdateClientDetails(Client{Type: client.Type, RoomID: requestJoinRoom.RoomID})

	filteredRoom := room.GetFilteredRoom()

	serverMessageJoinRoom, serverMessageJoinRoomMarshalError := json.Marshal(struct {
		Room RoomRecord `json:"room"`
		Type ClientType `json:"clientType"`
	}{
		Room: filteredRoom,
		Type: client.Type,
	})

	if serverMessageJoinRoomMarshalError != nil {
		logger.Error("[%s] [JoinRoom] Failed to marshal host room response: %s\n", client.PrivateToken, serverMessageJoinRoomMarshalError)
		serverResponses = append(serverResponses, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeJoinRoom,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageInternalServerError,
			},
		})

		return serverResponses
	}

	serverResponses = append(serverResponses, DirectedServerMessage{
		token: client.PrivateToken,
		message: ServerMessage{
			MessageType:    ServerMessageTypeJoinRoom,
			MessageDetails: serverMessageJoinRoom,
			Status:         ServerMessageStatusOk,
			ErrorMessage:   "",
		},
	})

	if room.VideoDetails.Title != "" {
		serverMessageRoomDetails, serverMessageMarshalError := json.Marshal(room.VideoDetails)
		if serverMessageMarshalError != nil {
			logger.Error("[%s] [JoinRoom:UpdateVideoDetails] Bad json while updating data: %s\n", client.PrivateToken, client.RoomID)
		} else {
			serverResponses = append(serverResponses, DirectedServerMessage{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectVideoDetails,
					MessageDetails: serverMessageRoomDetails,
					Status:         ServerMessageStatusOk,
					ErrorMessage:   "",
				},
			})
		}
	}

	serverResponses = append(serverResponses, updateRoomClientsWithLatestChanges(*room)...)

	return serverResponses
}

func DisconnectRoomHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	return manager.disconnectClientFromRoom(client)
}

type RoomReflection struct {
	ID          string  `json:"id"`
	State       int     `json:"state"`
	CurrentTime float32 `json:"time"`
}

func ReflectRoomHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	var reflection RoomReflection
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &reflection)
	if errorParsingRequest != nil {
		logger.Error("[%s] [ReflectRoom] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageBadJson,
				},
			},
		}
	}

	room, exists := manager.GetRegisteredRoom(client.RoomID)
	if !exists {
		logger.Info("[%s] [ReflectRoom] No room found with id: %s\n", client.IPAddress, client.RoomID)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageNoRoom,
				},
			},
		}
	}

	if client.Type != ClientTypeHost {
		logger.Info("[%s] [ReflectRoom] Client isn't a host\n", client.IPAddress)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageClientNotHost,
				},
			},
		}
	}

	serverMessageReflection, serverMessageMarshalError := json.Marshal(reflection)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [ReflectRoom] Bad json: %s\n", client.IPAddress, client.RoomID)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectRoom,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageInternalServerError,
				},
			},
		}
	}

	serverMessages := make([]DirectedServerMessage, 0, len(room.Viewers))

	for _, viewer := range room.Viewers {
		serverMessages = append(serverMessages, DirectedServerMessage{
			token: viewer.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeReflectRoom,
				MessageDetails: serverMessageReflection,
				Status:         ServerMessageStatusOk,
				ErrorMessage:   "",
			},
		})
	}

	return serverMessages
}

type VideoDetails struct {
	Title           string `json:"title"`
	Author          string `json:"author"`
	AuthorImage     string `json:"authorImage"`
	SubscriberCount string `json:"subscriberCount"`
	LikeCount       string `json:"likeCount"`
}

func ReflectDetailsHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	var videoDetails VideoDetails
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &videoDetails)
	if errorParsingRequest != nil {
		logger.Error("[%s] [ReflectVideoDetails] Client sent bad json object: %s\n", client.PrivateToken, errorParsingRequest)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectVideoDetails,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageBadJson,
				},
			},
		}
	}

	room, exists := manager.GetRegisteredRoom(client.RoomID)
	if !exists {
		logger.Info("[%s] [ReflectVideoDetails] No room found with id: %s\n", client.PrivateToken, client.RoomID)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectVideoDetails,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageNoRoom,
				},
			},
		}
	}

	if client.Type != ClientTypeHost {
		logger.Info("[%s] [ReflectVideoDetails] Client isn't a host\n", client.PrivateToken)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectVideoDetails,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageClientNotHost,
				},
			},
		}
	}

	if videoDetails.Title == "" || videoDetails.Author == "" || videoDetails.AuthorImage == "" ||
		videoDetails.SubscriberCount == "" || videoDetails.LikeCount == "" {

		logger.Info("[%s] [ReflectVideoDetails] Client sent malformed details %+v\n", client.PrivateToken, videoDetails)
		return nil
	}
	room.SaveVideoDetails(videoDetails)

	serverMessageRoomDetails, serverMessageMarshalError := json.Marshal(videoDetails)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [ReflectVideoDetails] Bad json: %s\n", client.PrivateToken, client.RoomID)
		return []DirectedServerMessage{
			{
				token: client.PrivateToken,
				message: ServerMessage{
					MessageType:    ServerMessageTypeReflectVideoDetails,
					MessageDetails: nil,
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageInternalServerError,
				},
			},
		}
	}

	serverMessages := make([]DirectedServerMessage, 0, len(room.Viewers))
	for _, viewer := range room.Viewers {
		serverMessages = append(serverMessages, DirectedServerMessage{
			token: viewer.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypeReflectVideoDetails,
				MessageDetails: serverMessageRoomDetails,
				Status:         ServerMessageStatusOk,
				ErrorMessage:   "",
			},
		})
	}

	return serverMessages
}

type Timestamp int64

type PingPong struct {
	Timestamp Timestamp `json:"timestamp"`
}

func PingHandler(client *Client, manager *Manager, clientRequest string) []DirectedServerMessage {
	serverMessages := make([]DirectedServerMessage, 0, 1)

	var ping PingPong
	errorParsingRequest := json.Unmarshal([]byte(clientRequest), &ping)

	if errorParsingRequest != nil {
		logger.Error("[%s] [Ping] Client sent bad json object: %s\n", client.IPAddress, errorParsingRequest)
		serverMessages = append(serverMessages, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypePong,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageBadJson,
			},
		})

		return serverMessages
	}

	pong := PingPong{
		Timestamp: Timestamp(time.Now().UnixMilli()),
	}

	serverMessagePong, serverMessageMarshalError := json.Marshal(pong)
	if serverMessageMarshalError != nil {
		logger.Error("[%s] [Ping] Bad json: %s\n", client.IPAddress, client.RoomID)
		serverMessages = append(serverMessages, DirectedServerMessage{
			token: client.PrivateToken,
			message: ServerMessage{
				MessageType:    ServerMessageTypePong,
				MessageDetails: nil,
				Status:         ServerMessageStatusError,
				ErrorMessage:   ServerErrorMessageInternalServerError,
			},
		})

		return serverMessages
	}

	serverMessages = append(serverMessages, DirectedServerMessage{
		token: client.PrivateToken,
		message: ServerMessage{
			MessageType:    ServerMessageTypePong,
			MessageDetails: serverMessagePong,
			Status:         ServerMessageStatusOk,
			ErrorMessage:   "",
		},
	})
	return serverMessages
}

func updateRoomClientsWithLatestChanges(room Room) []DirectedServerMessage {
	serverMessages := make([]DirectedServerMessage, 0, len(room.Viewers)+1)

	filteredRoom := room.GetFilteredRoom()
	serverMessageUpdateRoom, serverMessageUpdateRoomMarshalError := json.Marshal(filteredRoom)
	if serverMessageUpdateRoomMarshalError != nil {
		logger.Error("[UpdateRoom] Bad json: %s\n", serverMessageUpdateRoomMarshalError)
	}

	var serverMessage ServerMessage
	if serverMessageUpdateRoomMarshalError != nil {
		serverMessage = ServerMessage{
			MessageType:    ServerMessageTypeUpdateRoom,
			MessageDetails: nil,
			Status:         ServerMessageStatusError,
			ErrorMessage:   ServerErrorMessageInternalServerError,
		}
	} else {
		serverMessage = ServerMessage{
			MessageType:    ServerMessageTypeUpdateRoom,
			MessageDetails: serverMessageUpdateRoom,
			Status:         ServerMessageStatusOk,
			ErrorMessage:   "",
		}
	}

	serverMessages = append(serverMessages, DirectedServerMessage{
		token:   room.Host.PrivateToken,
		message: serverMessage,
	})

	for _, viewer := range room.Viewers {
		serverMessages = append(serverMessages, DirectedServerMessage{
			token:   viewer.PrivateToken,
			message: serverMessage,
		})
	}

	return serverMessages
}
