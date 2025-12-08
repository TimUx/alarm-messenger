# Server Setup Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Firebase project (for push notifications)
- SQLite3 (included in dependencies)

## Step 1: Install Dependencies

```bash
cd server
npm install
```

## Step 2: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file securely

## Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Database
DATABASE_PATH=./data/alarm-messenger.db

# Security
API_SECRET_KEY=your-secret-key-here

# Optional: Server URL for QR codes
SERVER_URL=http://localhost:3000
```

**Important:** 
- Keep your Firebase credentials secure
- Never commit `.env` file to version control
- Replace newlines in `FIREBASE_PRIVATE_KEY` with `\n`

## Step 4: Build the Application

```bash
npm run build
```

This will compile TypeScript to JavaScript in the `dist` directory.

## Step 5: Start the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the port specified in `.env` (default: 3000).

## Step 6: Verify Installation

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-07T19:00:00.000Z"
}
```

## Database

The SQLite database is automatically created at first run in the `data` directory.

### Database Schema

**emergencies**
- `id` (TEXT, PRIMARY KEY)
- `emergency_number` (TEXT)
- `emergency_date` (TEXT)
- `emergency_keyword` (TEXT)
- `emergency_description` (TEXT)
- `emergency_location` (TEXT)
- `created_at` (TEXT)
- `active` (INTEGER)

**devices**
- `id` (TEXT, PRIMARY KEY)
- `device_token` (TEXT, UNIQUE)
- `registration_token` (TEXT)
- `platform` (TEXT)
- `registered_at` (TEXT)
- `active` (INTEGER)

**responses**
- `id` (TEXT, PRIMARY KEY)
- `emergency_id` (TEXT, FOREIGN KEY)
- `device_id` (TEXT, FOREIGN KEY)
- `participating` (INTEGER)
- `responded_at` (TEXT)

### Backup Database

```bash
cp data/alarm-messenger.db data/alarm-messenger.db.backup
```

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start dist/index.js --name alarm-messenger

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t alarm-messenger-server .
docker run -p 3000:3000 --env-file .env -v $(pwd)/data:/app/data alarm-messenger-server
```

### Using systemd

Create `/etc/systemd/system/alarm-messenger.service`:

```ini
[Unit]
Description=Alarm Messenger Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/alarm-messenger/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable alarm-messenger
sudo systemctl start alarm-messenger
sudo systemctl status alarm-messenger
```

## HTTPS/SSL Setup

### Using Nginx as Reverse Proxy

Install Nginx:
```bash
sudo apt-get install nginx
```

Create `/etc/nginx/sites-available/alarm-messenger`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/alarm-messenger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Setup SSL with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Using Caddy

Create `Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Run Caddy:
```bash
caddy run
```

## Monitoring

### Logs

View logs:
```bash
# PM2
pm2 logs alarm-messenger

# systemd
sudo journalctl -u alarm-messenger -f

# Docker
docker logs -f container-name
```

### Health Checks

Setup a cron job to check server health:

```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:3000/health || echo "Server down" | mail -s "Alert" admin@example.com
```

## Performance Tuning

### Node.js Options

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Database Optimization

```bash
# Vacuum database periodically
sqlite3 data/alarm-messenger.db "VACUUM;"
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Keep Firebase credentials secure
- [ ] Enable firewall rules
- [ ] Implement API authentication
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup database regularly
- [ ] Use strong API_SECRET_KEY
- [ ] Limit CORS origins in production
- [ ] Enable rate limiting

## Troubleshooting

### Server won't start

1. Check Node.js version: `node --version`
2. Check if port is available: `lsof -i :3000`
3. Check environment variables: `cat .env`
4. Check logs for errors

### Firebase errors

1. Verify Firebase credentials are correct
2. Ensure Firebase project has Cloud Messaging enabled
3. Check Firebase service account permissions

### Database errors

1. Ensure `data` directory exists and is writable
2. Check database file permissions
3. Verify SQLite3 is installed

### Push notifications not working

1. Verify Firebase configuration
2. Check device FCM tokens are valid
3. Ensure Cloud Messaging is enabled in Firebase
4. Check server logs for FCM errors

## Updating

```bash
# Pull latest changes
git pull

# Install dependencies
npm install

# Rebuild
npm run build

# Restart server
pm2 restart alarm-messenger
```

## Support

For issues, check:
1. Server logs
2. Database integrity
3. Network connectivity
4. Firebase status
5. GitHub issues

## Next Steps

After setup:
1. Test API endpoints
2. Generate QR codes for device registration
3. Setup monitoring
4. Configure backups
5. Setup mobile apps
