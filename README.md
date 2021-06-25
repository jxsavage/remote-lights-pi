# Pi Socket Server

Hosts the Socket.io server and handles writing to the redis database.

## Setup

### Docker

[Docker Instructions](https://www.docker.com/blog/getting-started-with-docker-for-arm-on-linux/)

- Run `curl -fsSL test.docker.com -o get-docker.sh && sh get-docker.sh`

- Add user to docker group to avoid needing sudo : `sudo usermod -aG docker $USER`
