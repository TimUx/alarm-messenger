# Alarm Messenger Mobile App (Flutter)

Eine plattformübergreifende mobile App für das Alarm Messenger System, entwickelt mit Flutter.

## 📱 Funktionen

- ✅ QR-Code Scanner zur Geräteregistrierung
- ✅ Echtzeit-Push-Benachrichtigungen via WebSocket
- ✅ Alarmton bei neuen Einsätzen
- ✅ Rückmeldefunktion (Teilnahme Ja/Nein)
- ✅ Einsatz-Historie
- ✅ Hell/Dunkel-Theme
- ✅ Unterstützung für Android und iOS

## 🚀 Entwicklung

### Voraussetzungen

- Flutter SDK 3.27.1 oder höher
- Dart 3.5.0 oder höher
- Android Studio / Xcode (für native Entwicklung)
- Java 17+ (für Android)

### Installation

```bash
# Flutter SDK installieren (falls noch nicht vorhanden)
# Siehe: https://docs.flutter.dev/get-started/install

# In das mobile Verzeichnis wechseln
cd mobile

# Dependencies installieren
flutter pub get

# App ausführen (Android)
flutter run

# App ausführen (iOS - nur auf macOS)
flutter run
```

### Build

#### Android Debug APK
```bash
flutter build apk --debug
```

#### Android Release APK
```bash
flutter build apk --release
```

#### Android App Bundle (für Play Store)
```bash
flutter build appbundle --release
```

#### iOS (erfordert macOS)
```bash
flutter build ios --release
```

## 📦 Abhängigkeiten

Die wichtigsten Flutter-Pakete:

- `provider` - State Management
- `http` - HTTP Client
- `web_socket_channel` - WebSocket Kommunikation
- `shared_preferences` - Lokale Datenspeicherung
- `qr_code_scanner` - QR-Code Scanner
- `permission_handler` - Berechtigungsverwaltung
- `audioplayers` - Alarmton-Wiedergabe
- `flutter_local_notifications` - Push-Benachrichtigungen
- `intl` - Internationalisierung und Datumsformatierung

## 🏗️ Projektstruktur

```
lib/
├── main.dart                    # App-Einstiegspunkt
├── models/                      # Datenmodelle
│   └── models.dart
├── services/                    # Services (API, Storage, WebSocket, etc.)
│   ├── api_service.dart
│   ├── storage_service.dart
│   ├── websocket_service.dart
│   └── alarm_service.dart
├── providers/                   # State Management
│   ├── app_state.dart
│   └── theme_provider.dart
├── screens/                     # UI Screens
│   ├── registration_screen.dart
│   ├── home_screen.dart
│   └── emergency_alert_screen.dart
└── widgets/                     # Wiederverwendbare Widgets
```

## 🔧 Konfiguration

### Android

Die Android-Konfiguration befindet sich in `android/app/build.gradle`:

- **Package Name**: `com.alarmmessenger`
- **Min SDK**: 21 (Android 5.0)
- **Target SDK**: Latest
- **Compile SDK**: Latest

Erforderliche Berechtigungen (AndroidManifest.xml):
- INTERNET
- CAMERA
- VIBRATE
- WAKE_LOCK
- RECEIVE_BOOT_COMPLETED
- POST_NOTIFICATIONS

### iOS

Die iOS-Konfiguration befindet sich in `ios/Runner/Info.plist`:

- **Bundle Identifier**: `com.alarmmessenger`
- **Deployment Target**: iOS 12.0+

Erforderliche Berechtigungen:
- NSCameraUsageDescription (Kamera-Zugriff für QR-Code Scanner)
- NSMicrophoneUsageDescription (Mikrofon für Alarmbenachrichtigungen)

## 🔐 Code Signing (Release Builds)

### Android

1. Erstellen Sie einen Keystore:
   ```bash
   keytool -genkey -v -keystore alarm-messenger.keystore -alias alarm-messenger -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Konfigurieren Sie Umgebungsvariablen für CI/CD:
   - `ANDROID_KEYSTORE_BASE64`: Base64-kodierter Keystore
   - `ANDROID_KEY_ALIAS`: Key Alias
   - `ANDROID_STORE_PASSWORD`: Keystore Passwort
   - `ANDROID_KEY_PASSWORD`: Key Passwort

### iOS

Für iOS Release-Builds benötigen Sie:
- Apple Developer Account
- Code Signing Certificate
- Provisioning Profile

Details siehe: [Flutter iOS Deployment Guide](https://docs.flutter.dev/deployment/ios)

## 🤖 CI/CD

Die App wird automatisch über GitHub Actions gebaut:

### Workflow: `.github/workflows/flutter-mobile-build.yml`

- **Bei jedem Push**: Debug APK wird gebaut
- **Bei Tags `mobile-v*`**: Release APK und AAB werden gebaut und auf GitHub Releases hochgeladen
- **iOS**: Debug Build ohne Code Signing

### Artifacts

Nach jedem Build werden folgende Artifacts erstellt:
- `app-debug`: Debug APK
- `app-release`: Release APK (nur bei Tags)
- `app-release-bundle`: Release AAB (nur bei Tags)

## 📱 App-Verwendung

### 1. Geräteregistrierung

1. App starten
2. QR-Code aus dem Admin-Interface scannen
3. Automatische Registrierung beim Server

### 2. Einsatz-Benachrichtigung

1. Bei neuem Einsatz wird ein Alarmton abgespielt
2. Einsatz-Details werden angezeigt
3. Rückmeldung über "JA" oder "NEIN" Buttons

### 3. Einsatz-Historie

- Auf dem Home Screen werden alle Einsätze angezeigt
- Aktive Einsätze sind rot markiert
- Details durch Antippen eines Einsatzes

## 🎨 Theme

Die App unterstützt automatisch Hell- und Dunkel-Theme basierend auf den Systemeinstellungen.
Das Theme kann auch manuell über den Button in der App-Leiste umgeschaltet werden.

## 🐛 Debugging

```bash
# Flutter DevTools starten
flutter pub global activate devtools
flutter pub global run devtools

# Logs anzeigen
flutter logs

# Performance-Analyse
flutter run --profile
```

## 📄 Lizenz

MIT License - siehe LICENSE Datei im Repository-Root
