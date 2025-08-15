package room

func (r *Room) AddToQueue(videoDetails VideoDetails) {
	r.playlist = append(r.playlist, &videoDetails)
}

func (r *Room) RemoveFromQueue(index int) {
	if index >= len(r.playlist) {
		return
	}

	if index < 0 {
		return
	}

	reached := false
	for i := 0; i < len(r.playlist); i++ {
		if reached {
			r.playlist[i-1] = r.playlist[i]
		}

		if i == index {
			reached = true
		}
	}
}

func (r *Room) GetQueue() []*VideoDetails {
	copyPlaylist := make([]*VideoDetails, len(r.playlist))
	copy(copyPlaylist, r.playlist)
	return copyPlaylist
}
