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
- For mobile development:
  - Xcode (for iOS)
  - Android Studio (for Android)
  - React Native CLI

### Backend Setup

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

### Emergencies

- `POST /api/emergencies` - Create new emergency
- `GET /api/emergencies` - Get all emergencies
- `GET /api/emergencies/:id` - Get specific emergency
- `POST /api/emergencies/:id/responses` - Submit response
- `GET /api/emergencies/:id/participants` - Get participants
- `GET /api/emergencies/:id/responses` - Get all responses

### Devices

- `POST /api/devices/registration-token` - Generate QR code
- `POST /api/devices/register` - Register device
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get specific device
- `DELETE /api/devices/:id` - Deactivate device

## Usage Flow

1. **Admin generates QR code** via `POST /api/devices/registration-token`
2. **User scans QR code** in mobile app
3. **Device registers** with server and FCM token
4. **External system creates emergency** via `POST /api/emergencies`
5. **Server sends push notifications** to all registered devices
6. **Mobile app displays alert** with alarm sound
7. **User responds** (participate or decline)
8. **Response saved** in database
9. **External system retrieves participants** via `GET /api/emergencies/:id/participants`

## Security

- HTTPS/TLS encryption for all API communication
- Firebase Cloud Messaging for secure push notifications
- Rate limiting to prevent abuse
- Helmet middleware for security headers
- Device token validation

## Integration with Alarm Monitor

The system is designed to integrate with the [alarm-monitor](https://github.com/TimUx/alarm-monitor) project:

```javascript
// Example: Create emergency from alarm monitor
const response = await fetch('http://alarm-messenger-server:3000/api/emergencies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emergencyNumber: '2024-001',
    emergencyDate: '2024-12-07T19:00:00Z',
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  })
});

// Retrieve participants
const participants = await fetch(
  `http://alarm-messenger-server:3000/api/emergencies/${emergencyId}/participants`
).then(r => r.json());
```

## Design

The mobile app design is based on the alarm-monitor project with:
- Dark theme (#1a1a1a background)
- High contrast for emergency information
- Large, clearly visible action buttons
- Red accent color (#dc3545) for emergencies
- Material Icons for consistent iconography

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
