# Quick Start with Docker

The fastest way to run the Alarm Messenger server is using Docker.

## Prerequisites

- Docker installed on your Linux system
- Docker Compose (v2.0+)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TimUx/alarm-messenger.git
   cd alarm-messenger
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your API keys (Firebase no longer needed!)
   ```

3. **Start the server:**
   ```bash
   docker compose up -d
   ```

4. **Check if running:**
   ```bash
   curl http://localhost:3000/health
   ```

That's it! The server is now running on port 3000.

## Docker Commands

```bash
# Start server
docker compose up -d

# View logs
docker compose logs -f

# Stop server
docker compose down

# Restart server
docker compose restart

# Update and rebuild
docker compose up -d --build
```

## Development Mode

For development with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

## With SSL/TLS (Nginx)

```bash
# Generate self-signed certificate (testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Start with Nginx
docker compose --profile with-nginx up -d
```

## Documentation

For complete documentation, see:
- [docs/DOCKER.md](docs/DOCKER.md) - Complete Docker deployment guide
- [docs/SETUP.md](docs/SETUP.md) - Native Linux setup
- [docs/API.md](docs/API.md) - API documentation

## Support

- Check logs: `docker compose logs -f`
- Report issues: https://github.com/TimUx/alarm-messenger/issues
