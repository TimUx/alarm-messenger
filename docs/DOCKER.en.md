# Docker Deployment Guide

This guide explains how to deploy the Alarm Messenger server on Linux using Docker and docker-compose.

## Prerequisites

### System Requirements
- Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+, or similar)
- Docker 20.10+
- Docker Compose 2.0+
- 1GB RAM minimum
- 10GB disk space

### Install Docker

#### Ubuntu/Debian
```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### CentOS/RHEL
```bash
# Install dependencies
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version
```

#### Add User to Docker Group
```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/TimUx/alarm-messenger.git
cd alarm-messenger
```

### 2. Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

**Important:** Configure Firebase credentials in `.env` for push notifications to work.

### 3. Start Server (Production)
```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

The server will be available at `http://localhost:3000`

### 4. Verify Deployment
```bash
# Health check
curl http://localhost:3000/health

# Expected output:
# {"status":"ok","timestamp":"2024-12-07T19:00:00.000Z"}
```

## Development Mode

For development with hot reload:

```bash
# Start in development mode
docker compose -f docker-compose.dev.yml up

# The server will restart automatically when you edit files in server/src/
```

## Using Nginx Reverse Proxy

To add SSL/TLS support with Nginx:

### 1. Configure SSL Certificates

#### Self-Signed (Testing)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

#### Let's Encrypt (Production)
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate (stop docker-compose first)
docker compose down
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/*.pem
```

### 2. Enable Nginx in docker-compose.yml
```bash
# Uncomment HTTPS configuration in nginx/nginx.conf
nano nginx/nginx.conf

# Start with Nginx profile
docker compose --profile with-nginx up -d
```

Now the server is available at:
- HTTP: `http://localhost:80`
- HTTPS: `https://localhost:443`

## Docker Commands

### Start Services
```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d alarm-messenger-server

# Start with Nginx
docker compose --profile with-nginx up -d
```

### Stop Services
```bash
# Stop all services
docker compose down

# Stop but keep volumes
docker compose stop

# Stop and remove volumes (WARNING: deletes database)
docker compose down -v
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f alarm-messenger-server

# Last 100 lines
docker compose logs --tail=100 alarm-messenger-server
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart alarm-messenger-server
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

## Database Management

### Backup Database
```bash
# Create backup
docker compose exec alarm-messenger-server cp /app/data/alarm-messenger.db /app/data/backup-$(date +%Y%m%d-%H%M%S).db

# Copy backup to host
docker cp alarm-messenger-server:/app/data/backup-*.db ./backups/
```

### Restore Database
```bash
# Copy backup to container
docker cp ./backups/backup-20240101-120000.db alarm-messenger-server:/app/data/alarm-messenger.db

# Restart service
docker compose restart alarm-messenger-server
```

### View Database
```bash
# Access SQLite CLI
docker compose exec alarm-messenger-server sh -c "cd /app/data && sqlite3 alarm-messenger.db"

# Example queries
sqlite> .tables
sqlite> SELECT * FROM emergencies;
sqlite> .exit
```

## Monitoring

### Health Check
```bash
# Check container health
docker compose ps

# Manual health check
curl http://localhost:3000/health
```

### Resource Usage
```bash
# View resource usage
docker stats alarm-messenger-server

# View disk usage
docker system df
```

### Container Shell Access
```bash
# Access container shell
docker compose exec alarm-messenger-server sh

# View files
ls -la /app
cat /app/data/alarm-messenger.db

# Exit
exit
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker compose logs alarm-messenger-server

# Check container status
docker compose ps -a

# Rebuild image
docker compose build --no-cache
docker compose up -d
```

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3000

# Kill the process or change port in docker-compose.yml
```

### Permission Errors
```bash
# Fix volume permissions
sudo chown -R 1000:1000 ./server/data

# Or run as root (not recommended)
docker compose run --user root alarm-messenger-server sh
```

### Database Locked
```bash
# Stop all containers
docker compose down

# Remove stale lock
sudo rm ./server/data/*.db-shm ./server/data/*.db-wal

# Restart
docker compose up -d
```

### Firebase Not Working
```bash
# Check environment variables
docker compose exec alarm-messenger-server env | grep FIREBASE

# Verify credentials format
# Private key must have \n replaced with actual newlines in .env
```

## Production Deployment Checklist

- [ ] Configure proper `.env` file with Firebase credentials
- [ ] Setup SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Setup automated backups
- [ ] Configure log rotation
- [ ] Setup monitoring and alerts
- [ ] Test emergency notification flow
- [ ] Setup automatic container restart on failure
- [ ] Document deployment for team
- [ ] Configure reverse proxy (Nginx)
- [ ] Setup domain name and DNS

## Systemd Service (Optional)

To start docker-compose automatically on boot:

Create `/etc/systemd/system/alarm-messenger.service`:

```ini
[Unit]
Description=Alarm Messenger Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/alarm-messenger
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable alarm-messenger
sudo systemctl start alarm-messenger
sudo systemctl status alarm-messenger
```

## Performance Tuning

### Increase Container Resources
Edit `docker-compose.yml`:

```yaml
services:
  alarm-messenger-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### Enable Logging Rotation
Edit `docker-compose.yml`:

```yaml
services:
  alarm-messenger-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Security Best Practices

1. **Use secrets for sensitive data:**
   ```bash
   # Create Docker secret
   echo "your-api-key" | docker secret create api_secret_key -
   ```

2. **Run as non-root user:**
   Add to Dockerfile:
   ```dockerfile
   USER node
   ```

3. **Scan images for vulnerabilities:**
   ```bash
   docker scan alarm-messenger-server
   ```

4. **Keep Docker updated:**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade docker-ce docker-ce-cli containerd.io
   ```

5. **Use network isolation:**
   - Keep database in internal network
   - Only expose necessary ports

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify configuration: `docker compose config`
3. Test health endpoint: `curl http://localhost:3000/health`
4. Check GitHub issues
5. Review documentation

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Linux Server Administration](https://ubuntu.com/server/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
