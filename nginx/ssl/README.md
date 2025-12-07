# SSL Certificate Files

Place your SSL certificates here:

- `cert.pem` - SSL certificate
- `key.pem` - Private key

## Generating Self-Signed Certificates (for testing)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

## Using Let's Encrypt

For production, use Let's Encrypt certificates:

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

## Security

**Important:** Do not commit SSL certificates to version control!
