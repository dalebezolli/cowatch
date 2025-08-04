.PHONY: build vet fmt
build: vet
	go build -o bin/server cmd/server/main.go

vet: fmt
	go vet

fmt: 
	go fmt ./...
