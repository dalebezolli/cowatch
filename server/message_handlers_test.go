package main

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestAuthorizationHandler(t *testing.T) {
	t.Run("client sending no data", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)
		mockClientPrivateID := mockManager.GenerateToken()
		mockClient := NewClient(mockClientPrivateID)
		receivedServerMessages := AuthorizeHandler(mockClient, mockManager, "")

		expectedServerMessages := []DirectedServerMessage{
			{
				token: mockClientPrivateID,
				message: ServerMessage{
					MessageType:    ServerMessageTypeAuthorize,
					MessageDetails: json.RawMessage{},
					Status:         ServerMessageStatusError,
					ErrorMessage:   ServerErrorMessageBadJson,
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedServerMessages)
		assertExpectedMessages(
			t,
			expectedServerMessages,
			receivedServerMessages,
			func(a, b json.RawMessage) bool { return true },
		)

		assertManagerState(
			t,
			[]TokenExistence{
				{privateToken: mockClientPrivateID, exists: false},
			},
			*mockManager,
		)
	})

	t.Run("client receiving correct response after initial authentication", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)
		mockClientPrivateID := mockManager.GenerateToken()
		mockClient := NewClient(mockClientPrivateID)

		mockConnectionManager.RegisterClientConnection(mockClientPrivateID, nil)
		mockManager.RegisterClient(mockClient)

		messageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})

		receivedServerMessages := AuthorizeHandler(mockClient, mockManager, string(messageDetails))

		response, _ := json.Marshal(ServerResponseAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: mockClientPrivateID,
		})

		expectedServerMessages := []DirectedServerMessage{
			{
				token: mockClientPrivateID,
				message: ServerMessage{
					MessageType:    ServerMessageTypeAuthorize,
					MessageDetails: response,
					Status:         ServerMessageStatusOk,
					ErrorMessage:   "",
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedServerMessages)
		assertExpectedMessages(
			t,
			expectedServerMessages,
			receivedServerMessages,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes ServerResponseAuthorizeRoom
				var bRes ServerResponseAuthorizeRoom
				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				equal := aRes.Name == bRes.Name
				equal = equal && (aRes.Image == bRes.Image)
				equal = equal && (aRes.PrivateToken == bRes.PrivateToken)

				return equal
			},
		)

		assertManagerState(
			t,
			[]TokenExistence{
				{privateToken: mockClientPrivateID, exists: true},
			},
			*mockManager,
		)
	})

	t.Run("client reauthenticating after dropping connection", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		existingPrivateID := mockManager.GenerateToken()
		tempPrivateID := mockManager.GenerateToken()

		t.Logf("Generated IDs\nTemporaryID %q\nExistingID \t%q\n", tempPrivateID, existingPrivateID)

		mockClientExisting := NewClient(existingPrivateID)
		mockClientExisting.Name = "TestUser"
		mockConnectionManager.RegisterClientConnection(existingPrivateID, nil)
		mockManager.RegisterClient(mockClientExisting)

		mockClient := NewClient(tempPrivateID)
		mockConnectionManager.RegisterClientConnection(tempPrivateID, nil)
		mockManager.RegisterClient(mockClient)

		_, exists := mockManager.GetClient(existingPrivateID)
		t.Logf("Does client with id %q exist: %t\n", existingPrivateID, exists)

		messageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: existingPrivateID,
		})

		receivedServerMessages := AuthorizeHandler(mockClient, mockManager, string(messageDetails))

		response, _ := json.Marshal(ServerResponseAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: existingPrivateID,
		})

		expectedServerMessages := []DirectedServerMessage{
			{
				token: existingPrivateID,
				message: ServerMessage{
					MessageType:    ServerMessageTypeAuthorize,
					MessageDetails: response,
					Status:         ServerMessageStatusOk,
					ErrorMessage:   "",
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedServerMessages)
		assertExpectedMessages(
			t,
			expectedServerMessages,
			receivedServerMessages,
			func(a, b json.RawMessage) bool {
				var aRes ServerResponseAuthorizeRoom
				var bRes ServerResponseAuthorizeRoom
				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				t.Logf("Authorization Responses:\nA: %+v \nB: %+v\n", aRes, bRes)

				equal := aRes.Name == bRes.Name
				equal = equal && (aRes.Image == bRes.Image)
				equal = equal && (aRes.PrivateToken == bRes.PrivateToken)

				return equal
			},
		)
		assertManagerState(
			t,
			[]TokenExistence{
				{privateToken: tempPrivateID, exists: false},
				{privateToken: existingPrivateID, exists: true},
			},
			*mockManager,
		)
	})
}

func TestHostRoomHandler(t *testing.T) {
	t.Run("client receiving correct response after hosting room", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)
		mockClientPrivateID := mockManager.GenerateToken()
		mockClient := NewClient(mockClientPrivateID)

		mockConnectionManager.RegisterClientConnection(mockClientPrivateID, nil)
		mockManager.RegisterClient(mockClient)

		receivedServerMessages := HostRoomHandler(mockClient, mockManager, "")

		response, _ := json.Marshal(RoomRecord{
			RoomID:  "",
			Host:    mockClient.GetFilteredClient(),
			Viewers: []ClientRecord{},
		})

		expectedServerMessages := []DirectedServerMessage{
			{
				token: mockClientPrivateID,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: response,
					Status:         ServerMessageStatusOk,
					ErrorMessage:   "",
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedServerMessages)
		assertExpectedMessages(
			t,
			expectedServerMessages,
			receivedServerMessages,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes RoomRecord
				var bRes RoomRecord
				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				equal := aRes.Host.PublicToken == bRes.Host.PublicToken
				equal = equal && (bRes.RoomID != "")

				return equal
			},
		)
	})

	t.Run("client hosted room exists & contains correct privileges", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)
		mockClientPrivateID := mockManager.GenerateToken()
		mockClient := NewClient(mockClientPrivateID)

		mockConnectionManager.RegisterClientConnection(mockClientPrivateID, nil)
		mockManager.RegisterClient(mockClient)

		receivedServerMessages := HostRoomHandler(mockClient, mockManager, "")

		response, _ := json.Marshal(RoomRecord{
			RoomID:  "",
			Host:    mockClient.GetFilteredClient(),
			Viewers: []ClientRecord{},
		})

		expectedServerMessages := []DirectedServerMessage{
			{
				token: mockClientPrivateID,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: response,
					Status:         ServerMessageStatusOk,
					ErrorMessage:   "",
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedServerMessages)
		assertExpectedMessages(
			t,
			expectedServerMessages,
			receivedServerMessages,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes RoomRecord
				var bRes RoomRecord
				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				equal := aRes.Host.PublicToken == bRes.Host.PublicToken
				equal = equal && (bRes.RoomID != "")

				return equal
			},
		)

		var roomRecord RoomRecord
		json.Unmarshal(receivedServerMessages[0].message.MessageDetails, &roomRecord)

		room, exists := mockManager.GetRegisteredRoom(roomRecord.RoomID)
		if !exists {
			t.Errorf("Room with id %q was created but isn't registered\n", roomRecord.RoomID)
		}

		if room.Host.PrivateToken != mockClient.PrivateToken {
			t.Errorf(
				"Room with id %q does not contain the appropriate host privileges.\nExpected host: %q\nReceived host: %q",
				room.RoomID,
				mockClient.PrivateToken,
				room.Host.PrivateToken,
			)
		}
	})

	t.Run("client hosting room after hosting another room", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)
		mockClientPrivateID := mockManager.GenerateToken()
		mockClient := NewClient(mockClientPrivateID)

		mockConnectionManager.RegisterClientConnection(mockClientPrivateID, nil)
		mockManager.RegisterClient(mockClient)

		receivedServerMessagesFirst := HostRoomHandler(mockClient, mockManager, "")
		receivedServerMessagesSecond := HostRoomHandler(mockClient, mockManager, "")

		response, _ := json.Marshal(RoomRecord{
			RoomID:  "",
			Host:    mockClient.GetFilteredClient(),
			Viewers: []ClientRecord{},
		})

		expectedServerMessages1 := []DirectedServerMessage{
			{
				token: mockClientPrivateID,
				message: ServerMessage{
					MessageType:    ServerMessageTypeHostRoom,
					MessageDetails: response,
					Status:         ServerMessageStatusOk,
					ErrorMessage:   "",
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedServerMessagesFirst)
		assertExpectedMessageCount(t, 2, receivedServerMessagesSecond)

		assertExpectedMessages(
			t,
			expectedServerMessages1,
			receivedServerMessagesFirst,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes RoomRecord
				var bRes RoomRecord
				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				equal := aRes.Host.PublicToken == bRes.Host.PublicToken
				equal = equal && (bRes.RoomID != "")

				return equal
			},
		)

		expectedServerMessages2 := append([]DirectedServerMessage{
			{
				token: mockClientPrivateID,
				message: ServerMessage{
					MessageType:  ServerMessageTypeDisconnectRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
		}, expectedServerMessages1...)

		assertExpectedMessages(
			t,
			expectedServerMessages2,
			receivedServerMessagesSecond,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes RoomRecord
				var bRes RoomRecord
				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				equal := aRes.Host.PublicToken == bRes.Host.PublicToken
				equal = equal && (bRes.RoomID != "")

				return equal
			},
		)

		var roomRecordFirst RoomRecord
		json.Unmarshal(receivedServerMessagesFirst[0].message.MessageDetails, &roomRecordFirst)

		var roomRecordSecond RoomRecord
		json.Unmarshal(receivedServerMessagesSecond[1].message.MessageDetails, &roomRecordSecond)

		t.Logf("Created Rooms: First(%q) Second(%q)", roomRecordFirst.RoomID, roomRecordSecond.RoomID)

		_, exists := mockManager.GetRegisteredRoom(roomRecordFirst.RoomID)
		if exists {
			t.Errorf("Initially created room with id %q should not exist but does", roomRecordFirst.RoomID)
		}

		_, exists = mockManager.GetRegisteredRoom(roomRecordSecond.RoomID)
		if !exists {
			t.Errorf("Second created room with id %q should exist but doesn't", roomRecordSecond.RoomID)
		}
	})
}

func TestUpdateRoomClientsWithLatestChange(t *testing.T) {
	t.Run("updating room clients with a host only", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		hostClient := NewClient(mockManager.GenerateToken())

		roomID := mockManager.GenerateUniqueRoomID()
		testRoom, _ := NewRoom(roomID, hostClient)

		receivedChanges := updateRoomClientsWithLatestChanges(*testRoom)

		successfulUpdate := RoomRecord{
			RoomID:  roomID,
			Host:    hostClient.GetFilteredClient(),
			Viewers: []ClientRecord{},
		}

		successfulUpdateRawMessage, _ := json.Marshal(successfulUpdate)

		assertExpectedMessageCount(t, 1, receivedChanges)
		assertExpectedMessages(
			t,
			[]DirectedServerMessage{
				{
					token: hostClient.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeUpdateRoom,
						MessageDetails: successfulUpdateRawMessage,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
			},
			receivedChanges,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes RoomRecord
				var bRes RoomRecord

				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				return reflect.DeepEqual(aRes, bRes)
			},
		)
	})

	t.Run("updating room clients with host and multiple users", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		hostClient := NewClient(mockManager.GenerateToken())
		viewer1Client := NewClient(mockManager.GenerateToken())
		viewer2Client := NewClient(mockManager.GenerateToken())

		roomID := mockManager.GenerateUniqueRoomID()
		testRoom, _ := NewRoom(roomID, hostClient)

		testRoom.Viewers = append(testRoom.Viewers, viewer1Client)
		testRoom.Viewers = append(testRoom.Viewers, viewer2Client)

		receivedChanges := updateRoomClientsWithLatestChanges(*testRoom)

		successfulUpdate := RoomRecord{
			RoomID: roomID,
			Host:   hostClient.GetFilteredClient(),
			Viewers: []ClientRecord{
				viewer1Client.GetFilteredClient(),
				viewer2Client.GetFilteredClient(),
			},
		}

		successfulUpdateRawMessage, _ := json.Marshal(successfulUpdate)

		assertExpectedMessageCount(t, 3, receivedChanges)
		assertExpectedMessages(
			t,
			[]DirectedServerMessage{
				{
					token: hostClient.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeUpdateRoom,
						MessageDetails: successfulUpdateRawMessage,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
				{
					token: viewer1Client.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeUpdateRoom,
						MessageDetails: successfulUpdateRawMessage,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
				{
					token: viewer2Client.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeUpdateRoom,
						MessageDetails: successfulUpdateRawMessage,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
			},
			receivedChanges,
			func(a json.RawMessage, b json.RawMessage) bool {
				var aRes RoomRecord
				var bRes RoomRecord

				json.Unmarshal(a, &aRes)
				json.Unmarshal(b, &bRes)

				return reflect.DeepEqual(aRes, bRes)
			},
		)
	})
}

func TestJoinRoomHandler(t *testing.T) {
	t.Run("joining a room that exists and does not have a video loaded", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockHost := NewClient(mockManager.GenerateToken())
		mockRoom, _ := NewRoom(mockManager.GenerateUniqueRoomID(), mockHost)
		mockManager.RegisterRoom(mockRoom)

		mockViewer := NewClient(mockManager.GenerateToken())

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockHost, mockManager, string(authMessageDetails))

		authMessageDetails, _ = json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser2",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockViewer, mockManager, string(authMessageDetails))

		requestJoinRoom, _ := json.Marshal(ClientRequestJoinRoom{RoomID: mockRoom.RoomID})
		receivedJoinResponse := JoinRoomHandler(mockViewer, mockManager, string(requestJoinRoom))

		expectedJoinResponse := []DirectedServerMessage{
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeJoinRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
			{
				token: mockHost.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeUpdateRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeUpdateRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
		}

		assertExpectedMessageCount(t, 3, receivedJoinResponse)
		assertExpectedMessages(
			t,
			expectedJoinResponse,
			receivedJoinResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})

	t.Run("joining a room that exists and has a video loaded", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockHost := NewClient(mockManager.GenerateToken())
		mockRoom, _ := NewRoom(mockManager.GenerateUniqueRoomID(), mockHost)
		mockManager.RegisterRoom(mockRoom)
		mockRoom.VideoDetails = VideoDetails{
			Title:           "Title",
			Author:          "Author",
			AuthorImage:     "image",
			SubscriberCount: "5",
			LikeCount:       "100",
		}

		mockViewer := NewClient(mockManager.GenerateToken())

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockHost, mockManager, string(authMessageDetails))

		authMessageDetails, _ = json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser2",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockViewer, mockManager, string(authMessageDetails))

		requestJoinRoom, _ := json.Marshal(ClientRequestJoinRoom{RoomID: mockRoom.RoomID})
		receivedJoinResponse := JoinRoomHandler(mockViewer, mockManager, string(requestJoinRoom))

		expectedJoinResponse := []DirectedServerMessage{
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeJoinRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeReflectVideoDetails,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
			{
				token: mockHost.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeUpdateRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeUpdateRoom,
					Status:       ServerMessageStatusOk,
					ErrorMessage: "",
				},
			},
		}

		assertExpectedMessageCount(t, len(expectedJoinResponse), receivedJoinResponse)
		assertExpectedMessages(
			t,
			expectedJoinResponse,
			receivedJoinResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})

	t.Run("joining a room that does not exist", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockViewer := NewClient(mockManager.GenerateToken())

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser2",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockViewer, mockManager, string(authMessageDetails))

		requestJoinRoom, _ := json.Marshal(ClientRequestJoinRoom{RoomID: ""})
		receivedJoinResponse := JoinRoomHandler(mockViewer, mockManager, string(requestJoinRoom))

		expectedJoinResponse := []DirectedServerMessage{
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeJoinRoom,
					Status:       ServerMessageStatusError,
					ErrorMessage: ServerErrorMessageNoRoom,
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedJoinResponse)
		assertExpectedMessages(
			t,
			expectedJoinResponse,
			receivedJoinResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})

	t.Run("joining a room that's full", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockHost := NewClient(mockManager.GenerateToken())
		mockRoom, _ := NewRoom(mockManager.GenerateUniqueRoomID(), mockHost)
		for i := 0; i < 10; i++ {
			mockRoom.Viewers = append(mockRoom.Viewers, mockHost)
		}

		mockManager.RegisterRoom(mockRoom)

		mockViewer := NewClient(mockManager.GenerateToken())

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockHost, mockManager, string(authMessageDetails))

		authMessageDetails, _ = json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser2",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockViewer, mockManager, string(authMessageDetails))

		requestJoinRoom, _ := json.Marshal(ClientRequestJoinRoom{RoomID: mockRoom.RoomID})
		receivedJoinResponse := JoinRoomHandler(mockViewer, mockManager, string(requestJoinRoom))

		expectedJoinResponse := []DirectedServerMessage{
			{
				token: mockViewer.PrivateToken,
				message: ServerMessage{
					MessageType:  ServerMessageTypeJoinRoom,
					Status:       ServerMessageStatusError,
					ErrorMessage: ServerErrorMessageFullRoom,
				},
			},
		}

		assertExpectedMessageCount(t, 1, receivedJoinResponse)
		assertExpectedMessages(
			t,
			expectedJoinResponse,
			receivedJoinResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})
}

func TestDisconnectRoomHandler(t *testing.T) {
	t.Run("disconnecting a client that's innactive", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)
		mockClient := NewClient(mockManager.GenerateToken())

		receivedResponse := DisconnectRoomHandler(mockClient, mockManager, "")

		assertExpectedMessageCount(t, 0, receivedResponse)
	})

	t.Run("disconnecting a viewer", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockHost := NewClient(mockManager.GenerateToken())
		mockRoom, _ := NewRoom(mockManager.GenerateUniqueRoomID(), mockHost)
		mockManager.RegisterRoom(mockRoom)

		mockViewer := NewClient(mockManager.GenerateToken())

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockHost, mockManager, string(authMessageDetails))

		authMessageDetails, _ = json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser2",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockViewer, mockManager, string(authMessageDetails))
		mockViewer.RoomID = mockRoom.RoomID
		mockViewer.Type = ClientTypeViewer
		mockRoom.Viewers = append(mockRoom.Viewers, mockViewer)

		t.Logf("Connected clients: %+v\n", mockManager.clients)
		receivedResponse := DisconnectRoomHandler(mockViewer, mockManager, "")

		roomRecord, _ := json.Marshal(mockRoom.GetFilteredRoom())

		assertExpectedMessageCount(t, 2, receivedResponse)
		assertExpectedMessages(
			t,
			[]DirectedServerMessage{
				{
					token: mockHost.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeUpdateRoom,
						MessageDetails: roomRecord,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
				{
					token: mockViewer.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeDisconnectRoom,
						MessageDetails: nil,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
			},
			receivedResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})

	t.Run("disconnecting a host in a room with no viewers", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockHost := NewClient(mockManager.GenerateToken())
		mockRoom, _ := NewRoom(mockManager.GenerateUniqueRoomID(), mockHost)
		mockManager.RegisterRoom(mockRoom)

		mockHost.RoomID = mockRoom.RoomID
		mockHost.Type = ClientTypeHost

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})

		AuthorizeHandler(mockHost, mockManager, string(authMessageDetails))
		t.Logf("Connected clients: %+v\n", mockManager.clients)
		receivedResponse := DisconnectRoomHandler(mockHost, mockManager, "")

		assertExpectedMessageCount(t, 1, receivedResponse)
		assertExpectedMessages(
			t,
			[]DirectedServerMessage{
				{
					token: mockHost.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeDisconnectRoom,
						MessageDetails: nil,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
			},
			receivedResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})

	t.Run("disconnecting a host in a room with viewers", func(t *testing.T) {
		mockConnectionManager := NewGorillaConnectionManager()
		mockManager := NewManager(mockConnectionManager)

		mockHost := NewClient(mockManager.GenerateToken())
		mockRoom, _ := NewRoom(mockManager.GenerateUniqueRoomID(), mockHost)
		mockManager.RegisterRoom(mockRoom)

		mockViewer := NewClient(mockManager.GenerateToken())

		authMessageDetails, _ := json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockHost, mockManager, string(authMessageDetails))
		mockHost.RoomID = mockRoom.RoomID
		mockHost.Type = ClientTypeHost

		authMessageDetails, _ = json.Marshal(ClientRequestAuthorizeRoom{
			Name:         "TestUser2",
			Image:        "",
			PrivateToken: "",
		})
		AuthorizeHandler(mockViewer, mockManager, string(authMessageDetails))
		mockViewer.RoomID = mockRoom.RoomID
		mockViewer.Type = ClientTypeViewer
		mockRoom.Viewers = append(mockRoom.Viewers, mockViewer)

		t.Logf("Connected clients: %+v\n", mockManager.clients)
		receivedResponse := DisconnectRoomHandler(mockHost, mockManager, "")

		roomRecord, _ := json.Marshal(mockRoom.GetFilteredRoom())

		assertExpectedMessageCount(t, 3, receivedResponse)
		assertExpectedMessages(
			t,
			[]DirectedServerMessage{
				{
					token: mockHost.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeUpdateRoom,
						MessageDetails: roomRecord,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
				{
					token: mockViewer.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeDisconnectRoom,
						MessageDetails: nil,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
				{
					token: mockHost.PrivateToken,
					message: ServerMessage{
						MessageType:    ServerMessageTypeDisconnectRoom,
						MessageDetails: nil,
						Status:         ServerMessageStatusOk,
						ErrorMessage:   "",
					},
				},
			},
			receivedResponse,
			func(a, b json.RawMessage) bool {
				return true
			},
		)
	})
}

func assertExpectedMessageCount(t *testing.T, expected int, received []DirectedServerMessage) {
	t.Helper()

	if len(received) != expected {
		t.Errorf("Wrong number of responses: expected to receive %d responses but got %d\n", expected, len(received))
		return
	}
}

func assertExpectedMessages(
	t *testing.T,
	expected []DirectedServerMessage,
	received []DirectedServerMessage,
	messageComparisson func(a json.RawMessage, b json.RawMessage) bool,
) {
	t.Helper()

	if len(received) != len(expected) {
		t.Errorf("Assert expected to contain %d cases but got %d\n", len(received), len(expected))
		return
	}

	for index, receivedServerMessage := range received {
		equal := true
		equal = equal && (expected[index].token == receivedServerMessage.token)
		t.Logf("Token equal? %t (expected: %q received %q)\n", equal, expected[index].token, receivedServerMessage.token)
		equal = equal && (expected[index].message.MessageType == receivedServerMessage.message.MessageType)
		t.Logf("MessageType eqaul? %t (expected: %q received %q)\n", equal, expected[index].message.MessageType, receivedServerMessage.message.MessageType)
		equal = equal && (expected[index].message.ErrorMessage == receivedServerMessage.message.ErrorMessage)
		t.Logf("ErrorMessage eqaul? %t (expected: %q received %q)\n", equal, expected[index].message.ErrorMessage, receivedServerMessage.message.ErrorMessage)
		equal = equal && (expected[index].message.Status == receivedServerMessage.message.Status)
		t.Logf("Status eqaul? %t (expected %q, received %q)\n", equal, expected[index].message.Status, receivedServerMessage.message.Status)

		if expected[index].message.MessageDetails != nil && receivedServerMessage.message.MessageDetails != nil {
			equal = equal && messageComparisson(expected[index].message.MessageDetails, receivedServerMessage.message.MessageDetails)
			t.Logf("Message comparisson equal? %t\n", equal)
		}

		if !equal {
			t.Errorf("Response doesn't match with expected:\nExpected: %+v\nReceived: %+v", expected[index], receivedServerMessage)
		}
	}
}

type TokenExistence struct {
	privateToken Token
	exists       bool
}

func assertManagerState(t *testing.T, tokenStates []TokenExistence, manager Manager) {
	t.Helper()

	for _, tokenState := range tokenStates {
		_, exists := manager.GetClient(tokenState.privateToken)
		if exists != tokenState.exists {
			t.Errorf("Client with id %q expected to exist(%t) but got exist(%t)\n", tokenState.privateToken, tokenState.exists, exists)
		}

		_, connectionExists := manager.connectionManager.GetConnection(tokenState.privateToken)
		if connectionExists != tokenState.exists {
			t.Errorf("Client Connection with id %q expected to exist(%t) but got exist(%t)\n", tokenState.privateToken, tokenState.exists, connectionExists)
		}
	}
}
