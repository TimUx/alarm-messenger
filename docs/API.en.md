# API Documentation

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
- [Emergency Management](#emergency-management)
  - [Create Emergency](#create-emergency)
  - [Get All Emergencies](#get-all-emergencies)
  - [Get Emergency by ID](#get-emergency-by-id)
  - [Submit Response to Emergency](#submit-response-to-emergency)
  - [Get Emergency Participants](#get-emergency-participants)
  - [Get All Responses](#get-all-responses)
- [Device Management](#device-management)
  - [Generate Registration Token](#generate-registration-token)
  - [Register Device](#register-device)
  - [Get All Devices](#get-all-devices)
  - [Get Device by ID](#get-device-by-id)
  - [Deactivate Device](#deactivate-device)
- [Integration Examples](#integration-examples)
  - [Node.js Example](#nodejs-example)
  - [Python Example](#python-example)
  - [cURL Examples](#curl-examples)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Base URL

```
http://localhost:3000/api
```

For production, replace with your server URL.

## Authentication

The API uses **API Key authentication** for critical endpoints. A secure API key must be configured for production use.

**Protected endpoints require the HTTP header:**
```
X-API-Key: your-secret-api-key
```

**Configuration:**
```bash
# In server/.env or .env (Docker)
API_SECRET_KEY=your-secret-api-key-here
```

⚠️ **Important:** Change the default API key before production use! The server will issue a warning and reject requests if the default value is used in a production environment.

**More details:** See [AUTHENTIFIZIERUNG.md](AUTHENTIFIZIERUNG.md) for complete documentation (German).

## Endpoints

### Health Check

Check if the server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-07T19:00:00.000Z"
}
```

---

## Emergency Management

### Create Emergency

Create a new emergency and trigger push notifications to all registered devices.

**Endpoint:** `POST /api/emergencies`

🔒 **Authentication required:** API Key via `X-API-Key` header

**Request Headers:**
```
Content-Type: application/json
X-API-Key: your-secret-api-key
```

**Request Body:**
```json
{
  "emergencyNumber": "2024-001",
  "emergencyDate": "2024-12-07T19:00:00Z",
  "emergencyKeyword": "BRAND 3",
  "emergencyDescription": "Wohnungsbrand im 2. OG, Menschenrettung",
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
  "groups": "WIL26,SWA11"
}
```

**Parameters:**
- `emergencyNumber`, `emergencyDate`, `emergencyKeyword`, `emergencyDescription`, `emergencyLocation` – Required fields
- `groups` – Optional: Comma-separated list of group codes. If specified, only devices assigned to these groups are notified. Without this field, all active devices are notified.

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "emergencyNumber": "2024-001",
  "emergencyDate": "2024-12-07T19:00:00Z",
  "emergencyKeyword": "BRAND 3",
  "emergencyDescription": "Wohnungsbrand im 2. OG, Menschenrettung",
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
  "createdAt": "2024-12-07T19:00:00.000Z",
  "active": true,
  "groups": "WIL26,SWA11"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid characters in `groups` parameter
- `401 Unauthorized` - API key missing or invalid
- `409 Conflict` - An active emergency with this number already exists
- `500 Internal Server Error` - Server error

---

### Get All Emergencies

Retrieve all emergencies ordered by creation date (newest first). By default, only active emergencies are returned.

**Endpoint:** `GET /api/emergencies`

🔒 **Authentication required:** Device token via `X-Device-Token` header

**Request Headers:**
```
X-Device-Token: your-device-token
```

**Query Parameters (optional):**
- `page` – Page number (default: 1)
- `limit` – Items per page (default: 50, max: 200)
- `includeInactive=true` – Include completed emergencies
- `emergencyNumber` – Filter by emergency number

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "emergencyNumber": "2024-001",
      "emergencyDate": "2024-12-07T19:00:00Z",
      "emergencyKeyword": "BRAND 3",
      "emergencyDescription": "Wohnungsbrand im 2. OG",
      "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
      "createdAt": "2024-12-07T19:00:00.000Z",
      "active": true,
      "groups": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Device token missing or invalid

---

### Get Emergency by ID

Retrieve a specific emergency.

**Endpoint:** `GET /api/emergencies/:id`

🔒 **Authentication required:** Device token via `X-Device-Token` header

**Request Headers:**
```
X-Device-Token: your-device-token
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "emergencyNumber": "2024-001",
  "emergencyDate": "2024-12-07T19:00:00Z",
  "emergencyKeyword": "BRAND 3",
  "emergencyDescription": "Wohnungsbrand im 2. OG",
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
  "createdAt": "2024-12-07T19:00:00.000Z",
  "active": true,
  "groups": null
}
```

**Error Responses:**
- `401 Unauthorized` - Device token missing or invalid
- `404 Not Found` - Emergency not found

---

### Submit Response to Emergency

Submit a device's response (participate or decline) to an emergency.

**Endpoint:** `POST /api/emergencies/:id/responses`

🔒 **Authentication required:** Device token via `X-Device-Token` header

**Request Headers:**
```
Content-Type: application/json
X-Device-Token: your-device-token
```

**Request Body:**
```json
{
  "participating": true
}
```

**Response:** `201 Created`
```json
{
  "id": "response-uuid",
  "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "device-uuid",
  "participating": true,
  "respondedAt": "2024-12-07T19:05:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Device token missing or invalid
- `404 Not Found` - Emergency not found

---

### Get Emergency Participants

Retrieve all devices that confirmed participation for an emergency, **including full responder details** (name, qualifications, leadership role).

**Endpoint:** `GET /api/emergencies/:id/participants`

🔒 **Authentication required:** API Key via `X-API-Key` header

**Request Headers:**
```
X-API-Key: your-secret-api-key
```

**Response:** `200 OK`
```json
{
  "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
  "totalParticipants": 2,
  "participants": [
    {
      "id": "response-uuid-1",
      "deviceId": "device-uuid-1",
      "platform": "android",
      "respondedAt": "2024-12-07T19:02:00.000Z",
      "responder": {
        "firstName": "Max",
        "lastName": "Mustermann",
        "qualifications": {
          "machinist": true,
          "agt": true,
          "paramedic": false
        },
        "leadershipRole": "groupLeader"
      }
    },
    {
      "id": "response-uuid-2",
      "deviceId": "device-uuid-2",
      "platform": "ios",
      "respondedAt": "2024-12-07T19:03:00.000Z",
      "responder": {
        "firstName": "Anna",
        "lastName": "Schmidt",
        "qualifications": {
          "machinist": false,
          "agt": true,
          "paramedic": true
        },
        "leadershipRole": "none"
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - API key missing or invalid
- `404 Not Found` - Emergency not found

---

### Get All Responses

Retrieve all responses (both participating and declining) for an emergency, **including full responder details**.

**Endpoint:** `GET /api/emergencies/:id/responses`

🔒 **Authentication required:** API Key via `X-API-Key` header

**Request Headers:**
```
X-API-Key: your-secret-api-key
```

**Response:** `200 OK`
```json
[
  {
    "id": "response-uuid-1",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-1",
    "platform": "android",
    "participating": true,
    "respondedAt": "2024-12-07T19:02:00.000Z",
    "responder": {
      "firstName": "Max",
      "lastName": "Mustermann",
      "qualifications": {
        "machinist": true,
        "agt": true,
        "paramedic": false
      },
      "leadershipRole": "groupLeader"
    }
  },
  {
    "id": "response-uuid-2",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-2",
    "platform": "ios",
    "participating": false,
    "respondedAt": "2024-12-07T19:03:00.000Z",
    "responder": {
      "firstName": "Anna",
      "lastName": "Schmidt",
      "qualifications": {
        "machinist": false,
        "agt": true,
        "paramedic": true
      },
      "leadershipRole": "none"
    }
  }
]
```

**Error Responses:**
- `401 Unauthorized` - API key missing or invalid

---

## Device Management

### Generate Registration Token

Generate a QR code for device registration.

**Endpoint:** `POST /api/devices/registration-token`

**Response:** `200 OK`
```json
{
  "deviceToken": "generated-uuid",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "registrationData": {
    "token": "generated-uuid",
    "serverUrl": "http://localhost:3000"
  }
}
```

---

### Register Device

Register a mobile device with the server. The `deviceToken` must first be generated via `POST /api/devices/registration-token`.

**Endpoint:** `POST /api/devices/register`

**Request Body:**
```json
{
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "firstName": "Max",
  "lastName": "Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": false
  },
  "leadershipRole": "none",
  "fcmToken": "firebase-cloud-messaging-token",
  "apnsToken": "apple-push-notification-token"
}
```

**Parameters:**
- `deviceToken` – Token from QR code (required)
- `registrationToken` – Unique device identifier for WebSocket connection (required)
- `platform` – Either `"ios"` or `"android"` (required)
- `firstName`, `lastName` – Optional responder name
- `qualifications` – Optional qualifications (`machinist`, `agt`, `paramedic`)
- `leadershipRole` – Optional leadership role: `"none"`, `"groupLeader"`, `"commandLeader"`
- `fcmToken` – Optional Firebase Cloud Messaging token (Android push notifications)
- `apnsToken` – Optional Apple Push Notification Service token (iOS push notifications)

**Response:** `200 OK`
```json
{
  "id": "device-uuid",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-07T19:00:00.000Z",
  "active": true,
  "firstName": "Max",
  "lastName": "Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": false
  },
  "leadershipRole": "none"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid platform
- `403 Forbidden` - Invalid, expired, or already active token

---

### Get All Devices

Retrieve all registered and active devices.

**Endpoint:** `GET /api/devices`

**Response:** `200 OK`
```json
[
  {
    "id": "device-uuid",
    "deviceToken": "generated-uuid",
    "registrationToken": "device-unique-identifier",
    "platform": "android",
    "registeredAt": "2024-12-07T19:00:00.000Z",
    "active": true
  }
]
```

---

### Get Device by ID

Retrieve a specific device.

**Endpoint:** `GET /api/devices/:id`

**Response:** `200 OK`
```json
{
  "id": "device-uuid",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-07T19:00:00.000Z",
  "active": true
}
```

**Error Responses:**
- `404 Not Found` - Device not found

---

### Deactivate Device

Deactivate a registered device (soft delete).

**Endpoint:** `DELETE /api/devices/:id`

**Response:** `200 OK`
```json
{
  "message": "Device deactivated successfully"
}
```

**Error Responses:**
- `404 Not Found` - Device not found

---

## Integration Examples

### Node.js Example

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const API_KEY = process.env.API_SECRET_KEY; // Load from environment!

// Create an emergency
async function createEmergency() {
  const response = await axios.post(`${API_BASE_URL}/emergencies`, {
    emergencyNumber: '2024-001',
    emergencyDate: new Date().toISOString(),
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  }, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  console.log('Emergency created:', response.data);
  return response.data.id;
}

// Get participants (requires API key)
async function getParticipants(emergencyId) {
  const response = await axios.get(
    `${API_BASE_URL}/emergencies/${emergencyId}/participants`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  console.log('Participants:', response.data);
  return response.data.participants;
}

// Usage
(async () => {
  const emergencyId = await createEmergency();
  // Wait some time for responses...
  setTimeout(async () => {
    const participants = await getParticipants(emergencyId);
  }, 60000);
})();
```

### Python Example

```python
import requests
import json
import os
from datetime import datetime

API_BASE_URL = 'http://localhost:3000/api'
API_KEY = os.environ.get('API_SECRET_KEY')  # Load from environment!

def create_emergency():
    data = {
        'emergencyNumber': '2024-001',
        'emergencyDate': datetime.now().isoformat(),
        'emergencyKeyword': 'BRAND 3',
        'emergencyDescription': 'Wohnungsbrand im 2. OG',
        'emergencyLocation': 'Hauptstraße 123, 12345 Stadt'
    }
    
    response = requests.post(
        f'{API_BASE_URL}/emergencies',
        json=data,
        headers={'X-API-Key': API_KEY}
    )
    response.raise_for_status()
    
    emergency = response.json()
    print('Emergency created:', emergency)
    return emergency['id']

def get_participants(emergency_id):
    response = requests.get(
        f'{API_BASE_URL}/emergencies/{emergency_id}/participants',
        headers={'X-API-Key': API_KEY}
    )
    response.raise_for_status()
    
    data = response.json()
    print(f"Total participants: {data['totalParticipants']}")
    return data['participants']

# Usage
emergency_id = create_emergency()
participants = get_participants(emergency_id)
```

### cURL Examples

```bash
# Create emergency (requires API key)
curl -X POST http://localhost:3000/api/emergencies \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "emergencyNumber": "2024-001",
    "emergencyDate": "2024-12-07T19:00:00Z",
    "emergencyKeyword": "BRAND 3",
    "emergencyDescription": "Wohnungsbrand im 2. OG",
    "emergencyLocation": "Hauptstraße 123, 12345 Stadt"
  }'

# Get participants (requires API key)
curl http://localhost:3000/api/emergencies/{emergency-id}/participants \
  -H "X-API-Key: your-secret-api-key"

# Get all responses (requires API key)
curl http://localhost:3000/api/emergencies/{emergency-id}/responses \
  -H "X-API-Key: your-secret-api-key"

# Generate registration QR code
curl -X POST http://localhost:3000/api/devices/registration-token

# Get all devices
curl http://localhost:3000/api/devices
```

## Rate Limiting

The API implements rate limiting:
- **Limit:** 100 requests per 15 minutes per IP address
- **Response when exceeded:** `429 Too Many Requests`

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200 OK` - Successful GET request
- `201 Created` - Successful POST request
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Webhooks (Future Feature)

In future versions, the system may support webhooks to notify external systems of events:
- New emergency created
- Device registered
- Response submitted

## Best Practices

1. **Always validate responses** - Check HTTP status codes before processing
2. **Handle errors gracefully** - Implement retry logic for network failures
3. **Use HTTPS in production** - Never transmit sensitive data over HTTP
4. **Implement authentication** - Add API keys for production use
5. **Monitor rate limits** - Implement exponential backoff if rate limited
6. **Log all API calls** - For debugging and audit purposes
