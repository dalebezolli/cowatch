# cowatch - Watch YouTube with friends
> Web Extension for Firefox (& Chrome in the very near future)

The past few years we've seen many platforms ***pop*** that offer the ability to watch videos or listen to music with your friends.
Some were great but failed due to costs or bad management, others clunky and most of them took you outside of YouTube.

This project aims to solve the following problems:
- Allow all youtube content to be watchable [see here](https://www.reddit.com/r/discordapp/comments/v57utn/the_new_watch_together_feature_cant_even_play/)
- Simplify the process (ideally work directly on youtube)

## Table of Contents
- [Installation](#-installation)
- [How it Works](#-how-it-works)
- [Local Setup](#-local-setup)
- [Contributing](#contributing)
- [Liscence](#liscence)

## 🚀 Installation
If you want to try it out yourself [click here](https://github.com/dalebezolli/cowatch/releases)

> [!WARNING]
> The application is still in a very early stages of development.
> This means that I don't have an active server up at the moment as it would be impractical.
> I'd strongly advise you to contact me through the channels found in my profile if you're interested in trying the project out.

## 🤔 How it Works
The communication between server-client(extension) is managed through a WebSocket connection.
Practically the host of the room sends the state of the currently watched video to the server and the server broadcasts that to the viewers.
Then the client is responsible for collecting the data from the host and synchronzing with the data coming to the viewer.

The client extension is a event-driven extension which code lives in the `extension\src` directory. It activates only on tabs that are navigated to `youtube.com` and consists of four primary components:
- Room UI: The frontend of the application, it reflects the room and allows the user to act inside rooms.
- Client Collector: Handles the gathering of user data from the webpage (will be replaced in the future with managed users)
- Player Interceptor: Collects and synchronizes the state of the YouTube player.
- Core: Manages the communication between the above three systems and the server connection.

As we have to inject the code directly into the website, Room UI, Client Collector and Player Interceptor have to communicate through custom events which have their helper functions defined in `events.ts`. The `ClientMessage` events are sent from the aforementioned client facing code back to Core. The core then has handlers defined to manage all client facing events in `client_message_handlers`.

The core then parses the even and sends it to the server if required. After the server sent a request back, the message is sent to core where it's handled in `connection_messages` and triggers a `CoreAction` which is handled by the client facing handlers.

## 💻 Local Setup
To start the server run:
```sh
$ cd server
$ make
$ ./cowatch
```

To build the latest web-extension:
```sh
$ cd extension
$ npm run build
```
The built extension will be found in the `dist/firefox` and `dist/chrome` directories for their respective browsers.

To install it in Firefox you'll need to: 
- Fire up a firefox instance
- Write in the url bar `about:debugging#/runtime/this-firefox`
- Press on *"Load Temporary Add-on..."*
- Navigate to `dist/firefox` and click on the `manifest.json`

## Contributing
Will be discussed about in the very near future

## Liscence
Currently under © 2024 Panteli Bezolli. Will change in the future.
