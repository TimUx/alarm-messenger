# Alarm Messenger System

Alarmierungs System für Einsätze auf Mobile Devices mit Rückmeldefunktion

## System Overview

The Alarm Messenger system is a complete emergency notification solution consisting of:

1. **Backend Server** - Node.js/Express API for managing emergencies and device registrations
2. **Mobile App** - React Native app for iOS and Android with push notifications

## Features

### Backend Server
- ✅ RESTful API for emergency management
- ✅ Device registration with QR code generation
- ✅ Firebase Cloud Messaging (FCM) integration for push notifications
- ✅ Encrypted HTTPS/TLS communication
- ✅ SQLite database for data persistence
- ✅ Response tracking (participation yes/no)
- ✅ API endpoint to retrieve participating personnel
- ✅ **API Key authentication for emergency creation**
- ✅ **JWT-based admin authentication**
- ✅ **Extended device/responder information storage**

### Admin Web Interface (NEW)
- ✅ Password-protected admin login
- ✅ QR code generation and display
- ✅ Device/responder management dashboard
- ✅ Edit responder information (name, qualifications, leadership role)
- ✅ Dark theme matching alarm-monitor design (#1a1a1a background, #dc3545 accents)
- ✅ Responsive design for desktop and mobile

### Responder Information Management (NEW)
- ✅ Name storage for each registered device
- ✅ Training qualifications tracking:
  - Maschinist (Driver/Operator)
  - AGT (Atemschutzgeräteträger - Breathing Apparatus Wearer)
  - Sanitäter (Paramedic)
  - TH-VU (Technical Rescue - Traffic Accidents)
  - TH-BAU (Technical Rescue - Construction)
- ✅ Leadership role designation (Fahrzeugführer - Vehicle Commander)

### Mobile App
- ✅ QR code scanner for device registration
- ✅ Push notification handling
- ✅ Emergency alert UI with alarm sounds
- ✅ Two response buttons (participate/decline)
- ✅ Emergency history view
- ✅ Cross-platform support (iOS & Android)

## Architecture

```
┌─────────────────┐
│  External API   │ (e.g., Alarm Monitor)
│  (POST)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend Server │
│  (Node.js)      │
│  - API Routes   │
│  - Database     │
│  - FCM Service  │
└────────┬────────┘
         │ Push Notifications (FCM)
         ▼
┌─────────────────┐
│  Mobile Devices │
│  (iOS/Android)  │
│  - Alert UI     │
│  - Response     │
└─────────────────┘
```

## Project Structure

```
alarm-messenger/
├── server/              # Backend server
│   ├── src/
│   │   ├── index.ts    # Main server entry point
│   │   ├── models/     # Data models
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   └── utils/      # Utilities
│   ├── data/           # SQLite database
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/             # Mobile app
│   ├── src/
│   │   ├── App.tsx     # Main app component
│   │   ├── screens/    # UI screens
│   │   ├── services/   # API & notification services
│   │   ├── components/ # Reusable components
│   │   └── types/      # TypeScript types
│   ├── android/        # Android native code
│   ├── ios/           # iOS native code
│   ├── package.json
│   └── tsconfig.json
│
└── docs/              # Documentation
    ├── API.md
    ├── SETUP.md
    └── MOBILE.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project (for push notifications)
- **For Docker:** Docker and Docker Compose
- For mobile development:
  - Xcode (for iOS)
  - Android Studio (for Android)
  - React Native CLI

### Backend Setup

#### Option 1: Docker (Recommended for Linux)

```bash
cd alarm-messenger
cp .env.example .env
# Edit .env with your Firebase credentials
docker compose up -d
```

The server will start on `http://localhost:3000`

See [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) for more details.

#### Option 2: Native Installation

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Firebase credentials
npm run build
npm start
```

The server will start on `http://localhost:3000`

### Mobile App Setup

```bash
cd mobile
npm install

# For iOS
cd ios && pod install && cd ..
npm run ios

# For Android
npm run android
```

## API Endpoints

### Admin Authentication

- `POST /api/admin/init` - Initialize first admin user (unprotected, only works when no users exist)
- `POST /api/admin/login` - Admin login (returns JWT token)
- `POST /api/admin/users` - Create additional admin users (requires JWT token)
- `PUT /api/admin/devices/:id` - Update device/responder information (requires JWT token)

### Emergencies

- `POST /api/emergencies` - Create new emergency (requires API key via X-API-Key header)
- `GET /api/emergencies` - Get all emergencies
- `GET /api/emergencies/:id` - Get specific emergency
- `POST /api/emergencies/:id/responses` - Submit response
- `GET /api/emergencies/:id/participants` - Get participants
- `GET /api/emergencies/:id/responses` - Get all responses

### Devices

- `POST /api/devices/registration-token` - Generate QR code
- `POST /api/devices/register` - Register device (with optional responder info)
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get specific device
- `DELETE /api/devices/:id` - Deactivate device

## Usage Flow

1. **Admin initializes account** via `POST /api/admin/init` (first time only)
2. **Admin logs in** at `/admin/login.html`
3. **Admin generates QR code** via admin dashboard
4. **Admin enters responder information** for the device (name, qualifications, leadership role)
5. **User scans QR code** in mobile app
6. **Device registers** with server, FCM token, and responder information
7. **External system creates emergency** via `POST /api/emergencies` with API key
8. **Server sends push notifications** to all registered devices
9. **Mobile app displays alert** with alarm sound
10. **User responds** (participate or decline)
11. **Response saved** in database with responder information
12. **External system retrieves participants** via `GET /api/emergencies/:id/participants` with full responder details

## Security

- HTTPS/TLS encryption for all API communication
- API Key authentication for emergency creation (X-API-Key header)
- JWT-based authentication for admin interface
- Password hashing with bcrypt for admin users
- Firebase Cloud Messaging for secure push notifications
- Rate limiting to prevent abuse
- Helmet middleware for security headers
- Device token validation

## Admin Interface

The admin interface is accessible at `http://your-server:3000/admin/` and provides:

### Login
![Admin Login](https://github.com/user-attachments/assets/5216ebb2-df74-4205-be56-fce65985ab3f)

### Dashboard with QR Code Generation
![Admin Dashboard](https://github.com/user-attachments/assets/aa28f7c5-b6a9-4bc1-8a3d-b03971f23dfd)

### QR Code Display
![QR Code Generation](https://github.com/user-attachments/assets/4c3b4cc3-fedd-4f6b-9892-d95aabc55f2d)

### Responder Information Management
![Edit Responder](https://github.com/user-attachments/assets/14457c74-b918-44e3-aba2-8e22532ae3e0)

### Initial Admin Setup

Before using the admin interface, create the first admin user:

```bash
curl -X POST http://localhost:3000/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-secure-password"}'
```

This endpoint only works when no admin users exist yet. After that, use the login page at `/admin/login.html`.

## Integration with Alarm Monitor

The system is designed to integrate with the [alarm-monitor](https://github.com/TimUx/alarm-monitor) project:

```javascript
// Example: Create emergency from alarm monitor
const response = await fetch('http://alarm-messenger-server:3000/api/emergencies', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-secret-key'  // Required for authentication
  },
  body: JSON.stringify({
    emergencyNumber: '2024-001',
    emergencyDate: '2024-12-07T19:00:00Z',
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  })
});

// Retrieve participants with responder information
const participants = await fetch(
  `http://alarm-messenger-server:3000/api/emergencies/${emergencyId}/participants`,
  {
    headers: { 'X-API-Key': 'your-api-secret-key' }
  }
).then(r => r.json());

// participants now includes responder details:
// - name
// - qualifications (machinist, agt, paramedic, thVu, thBau)
// - isSquadLeader
```

## Design

### Mobile App

The mobile app design is based on the alarm-monitor project with:
- Dark theme (#1a1a1a background)
- High contrast for emergency information
- Large, clearly visible action buttons
- Red accent color (#dc3545) for emergencies
- Material Icons for consistent iconography

The mobile app includes:
- QR code scanner for registration
- Push notification support
- Emergency alert screen with alarm sound
- Response buttons (participate/decline)
- Emergency history view

### Admin Web Interface

The admin interface follows the alarm-monitor design style:
- Dark theme (#1a1a1a background)
- Red accent color (#dc3545) for emphasis
- Clean, modern card-based layout
- Responsive design for all screen sizes
- Intuitive navigation and controls

## Deployment Options

### Linux Native
Run directly on Linux with Node.js. See [docs/SETUP.md](docs/SETUP.md)

### Docker Container
Run in Docker container with docker-compose. See [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) or [docs/DOCKER.md](docs/DOCKER.md)

### Production Deployment
- Use Docker with Nginx reverse proxy for SSL/TLS
- Configure systemd for automatic startup
- Setup automated backups
- Use PM2 for process management (native installation)

See [docs/DOCKER.md](docs/DOCKER.md) for complete deployment instructions.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
