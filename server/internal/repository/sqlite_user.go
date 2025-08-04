package repository

import (
	"database/sql"
	"fmt"

	"github.com/cowatch/internal/extra"
	"github.com/cowatch/internal/model"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(dbURI string) (*UserRepo, error) {
	db, err := sql.Open("sqlite3", dbURI)
	if err != nil {
		return nil, fmt.Errorf("NewUserRepo: %w", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS users (
		id STRING PRIMARY KEY NOT NULL,
		publicId STRING NOT NULL,
		createdAt NUMBER,
		email STRING NOT NULL,
		name STRING,
		icon STRING,
		authId STRING NOT NULL,
		isTester BOOLEAN
	)`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("NewUserRepo: %w", err)
	}

	return &UserRepo{
		db: db,
	}, nil
}

func (r *UserRepo) Close() {
	r.db.Close()
}

func (r *UserRepo) Insert(user *model.User) error {
	row := r.db.QueryRow(`
		SELECT email FROM users WHERE email = ?
	`, user.Email)

	var emailCopy string
	err := row.Scan(&emailCopy)
	if err == nil {
		return fmt.Errorf("Insert: %s %w", user.Email, extra.ErrUserAlreadyRegistered)
	}

	fmt.Println("Saving user with auth ID: ", user.AuthId)

	_, err = r.db.Exec(`
		INSERT INTO users (id, publicId, email, name, icon, authId, createdAt, isTester) VALUES (
			?, ?, ?, ?, ?, ?, ?, FALSE
		)
	`, user.Id, user.PublicId, user.Email, user.Name, user.Icon, user.AuthId, user.CreatedAt)

	if err != nil {
		return fmt.Errorf("Insert: %s Failed execute insert query %w", user.Email, err)
	}

	return nil
}

func (r *UserRepo) GetUserFromPrivateId(privateID model.PrivateID) *model.User {
	row := r.db.QueryRow("SELECT id, email, name, icon, authId, publicId, createdAt, isTester FROM users WHERE id = ?", privateID)

	var user model.User
	err := row.Scan(&user.Id, &user.Email, &user.Name, &user.Icon, &user.AuthId, &user.PublicId, &user.CreatedAt, &user.IsTester)
	if err != nil {
		return nil
	}

	return &user
}

func (r *UserRepo) GetUserFromAuthID(authID string) *model.User {
	row := r.db.QueryRow("SELECT id, email, name, icon, authId, publicId, createdAt, isTester FROM users WHERE authId = ?", authID)

	var user model.User
	err := row.Scan(&user.Id, &user.Email, &user.Name, &user.Icon, &user.AuthId, &user.PublicId, &user.CreatedAt, &user.IsTester)
	if err != nil {
		return nil
	}

	return &user
}
