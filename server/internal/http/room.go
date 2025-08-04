package http

import (
	"fmt"
	"net/http"
)

func (s *Server) createRoom(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "New Room")
}

func (s *Server) getRoom(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Get Room Details %q\n", r.PathValue("roomId"))
}

func (s *Server) listenRoom(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Join Room %q\n", r.PathValue("roomId"))
}
