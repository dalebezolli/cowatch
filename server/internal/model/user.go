package model

type PrivateID string

type User struct {
	Id        PrivateID `json:"id"`
	PublicId  string    `json:"publicId"`
	AuthId    string    `json:"-"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon"`
	CreatedAt int64     `json:"-"`
	IsTester  bool      `json:"-"`
}
