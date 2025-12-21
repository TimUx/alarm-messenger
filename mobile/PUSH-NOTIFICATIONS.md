# Mobile App: Push Notification Integration

Diese Anleitung erklärt, wie Sie Push-Benachrichtigungen (FCM für Android, APNs für iOS) in der Alarm Messenger Mobile App aktivieren.

## Standard-Modus: WebSocket-only

**Die App funktioniert standardmäßig OHNE FCM/APNs** und nutzt nur WebSocket für Benachrichtigungen. Dies ermöglicht:

- ✅ Keine zusätzlichen Abhängigkeiten
- ✅ Keine Firebase-Konfiguration erforderlich
- ✅ Einfachere Entwicklung und Tests
- ✅ Volle Funktionalität wenn App aktiv ist

**Einschränkungen**:
- ⚠️ Benachrichtigungen im Hintergrund eingeschränkt (besonders iOS)
- ⚠️ Keine Benachrichtigungen bei geschlossener App

## Push-Benachrichtigungen aktivieren

Für produktive Einsätze empfehlen wir die Aktivierung von Push-Benachrichtigungen für bessere Hintergrund-Zuverlässigkeit.

### Voraussetzungen

- Server muss FCM/APNs unterstützen (siehe `/docs/PUSH-NOTIFICATIONS.md`)
- Firebase-Projekt für Android (kostenlos)
- Apple Developer Account für iOS ($99/Jahr)

### Schritt 1: Firebase-Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Erstelle ein neues Projekt oder wähle ein bestehendes
3. Füge Android und/oder iOS App hinzu:
   - **Android Package Name**: `com.alarmmessenger`
   - **iOS Bundle ID**: `com.alarmmessenger`

### Schritt 2: Firebase-Konfigurationsdateien herunterladen

#### Android
1. Firebase Console → Projekt-Einstellungen → Allgemein
2. Scrolle zu "Deine Apps" → Android App
3. Klicke auf "google-services.json herunterladen"
4. Speichere die Datei unter: `mobile/android/app/google-services.json`

#### iOS
1. Firebase Console → Projekt-Einstellungen → Allgemein
2. Scrolle zu "Deine Apps" → iOS App
3. Klicke auf "GoogleService-Info.plist herunterladen"
4. Speichere die Datei unter: `mobile/ios/Runner/GoogleService-Info.plist`
5. Füge die Datei in Xcode zum Runner-Target hinzu

### Schritt 3: Dependencies hinzufügen

Bearbeite `mobile/pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # ... existing dependencies ...
  
  # Add Firebase Messaging for push notifications
  firebase_messaging: ^14.7.0
  firebase_core: ^2.24.0
```

Dann installieren:

```bash
cd mobile
flutter pub get
```

### Schritt 4: Android-Konfiguration

#### 4.1 Gradle-Plugins hinzufügen

Bearbeite `mobile/android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // ... existing dependencies ...
        classpath 'com.google.gms:google-services:4.4.0'  // Add this line
    }
}
```

Bearbeite `mobile/android/app/build.gradle`:

```gradle
// Add at the bottom of the file
apply plugin: 'com.google.gms.google-services'
```

#### 4.2 Berechtigungen (bereits vorhanden)

Die erforderlichen Berechtigungen sind bereits in `android/app/src/main/AndroidManifest.xml` enthalten:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### Schritt 5: iOS-Konfiguration

#### 5.1 APNs in Xcode aktivieren

1. Öffne `mobile/ios/Runner.xcworkspace` in Xcode
2. Wähle das Runner-Target
3. Gehe zu "Signing & Capabilities"
4. Klicke auf "+ Capability"
5. Füge hinzu:
   - "Push Notifications"
   - "Background Modes" (aktiviere "Remote notifications")

#### 5.2 APNs-Schlüssel hochladen

1. Erstelle APNs-Schlüssel im [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Lade den .p8-Schlüssel herunter
3. Firebase Console → Projekt-Einstellungen → Cloud Messaging
4. Scrolle zu "Apple App Configuration"
5. Lade den APNs-Schlüssel hoch (Key ID und Team ID eingeben)

#### 5.3 Info.plist (bereits konfiguriert)

Die erforderlichen Einstellungen sind bereits in `ios/Runner/Info.plist` vorhanden.

### Schritt 6: Push Token Service aktivieren

Bearbeite `mobile/lib/services/push_token_service.dart` und entkommentiere die Implementierung:

1. Suche nach `// Uncomment this method when firebase_messaging is added`
2. Entkommentiere die Methoden `_initializeFCM` und `_initializeAPNs`
3. Füge die Firebase Messaging Imports hinzu:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
```

### Schritt 7: Firebase initialisieren

Bearbeite `mobile/lib/main.dart`:

```dart
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // ... rest of initialization ...
  
  runApp(const MyApp());
}
```

### Schritt 8: Push Token Service aufrufen

Die Push Token Service wird bereits in der App aufgerufen, aber standardmäßig ist die Implementierung deaktiviert. Nach Aktivierung der Implementierung in Schritt 6 funktioniert alles automatisch.

Der Aufruf erfolgt in der App nach erfolgreicher Registrierung:

```dart
// Already implemented in the app
await PushTokenService.initialize(deviceToken);
```

### Schritt 9: Testen

#### Android

```bash
cd mobile
flutter run --debug
```

Erwartete Log-Ausgabe:
```
[PushTokenService] FCM token obtained: ...
[PushTokenService] FCM token registered with server
```

#### iOS

```bash
cd mobile
flutter run --debug
```

Erwartete Log-Ausgabe:
```
[PushTokenService] APNs token obtained: ...
[PushTokenService] APNs token registered with server
```

**Hinweis**: Für iOS APNs müssen Sie auf einem echten Gerät testen (Simulator unterstützt keine Push-Benachrichtigungen).

### Schritt 10: Produktions-Build

#### Android

```bash
flutter build apk --release
# oder für Play Store
flutter build appbundle --release
```

#### iOS

```bash
flutter build ios --release
```

Dann in Xcode:
1. Product → Archive
2. Distribute App
3. Upload to App Store oder Export für Ad Hoc Distribution

## Background Message Handler (Optional)

Für Benachrichtigungen wenn die App komplett geschlossen ist, füge einen Background Message Handler hinzu:

Bearbeite `mobile/lib/main.dart`:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

// Top-level function for background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message received: ${message.messageId}');
  
  // Show local notification
  // (already implemented in NotificationService)
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Set up background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  runApp(const MyApp());
}
```

## Foreground Message Handler (Optional)

Für Benachrichtigungen wenn die App im Vordergrund ist:

```dart
// In your main app or home screen
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Foreground message received: ${message.notification?.title}');
  
  // Show local notification even when app is open
  if (message.notification != null) {
    NotificationService.showEmergencyNotification(
      title: message.notification!.title ?? 'Emergency',
      body: message.notification!.body ?? '',
      payload: jsonEncode(message.data),
    );
  }
});
```

## Debugging

### FCM Token nicht empfangen

**Android**:
1. Prüfe `google-services.json` ist vorhanden
2. Prüfe Firebase-Projekt ist korrekt konfiguriert
3. Prüfe Internet-Verbindung
4. Prüfe Logs: `flutter logs | grep FCM`

### APNs Token nicht empfangen

**iOS**:
1. Teste auf echtem Gerät (nicht Simulator)
2. Prüfe `GoogleService-Info.plist` ist in Xcode-Projekt
3. Prüfe Push Notifications Capability ist aktiviert
4. Prüfe APNs-Schlüssel ist in Firebase hochgeladen
5. Prüfe Berechtigungen wurden vom Benutzer erteilt
6. Prüfe Logs: `flutter logs | grep APNs`

### Token wird nicht an Server gesendet

1. Prüfe Server-URL ist korrekt
2. Prüfe Server läuft und ist erreichbar
3. Prüfe `/api/devices/update-push-token` Endpoint existiert
4. Prüfe Logs auf API-Fehler

## Deaktivierung von Push Notifications

Um Push Notifications wieder zu deaktivieren:

1. Entferne `firebase_messaging` und `firebase_core` aus `pubspec.yaml`
2. Kommentiere die Implementierung in `push_token_service.dart` wieder aus
3. Entferne Firebase-Konfigurationsdateien (optional)
4. Die App funktioniert wieder im WebSocket-only-Modus

## Vergleich: Mit vs. Ohne Push Notifications

| Feature | Ohne Push (WebSocket-only) | Mit Push (FCM/APNs) |
|---------|---------------------------|---------------------|
| Setup-Aufwand | ✅ Minimal | ⚠️ Mittel |
| Dependencies | ✅ Weniger | ⚠️ Mehr |
| App-Größe | ✅ Kleiner | ⚠️ Größer |
| App aktiv | ✅ Hervorragend | ✅ Hervorragend |
| App im Hintergrund | ⚠️ Begrenzt | ✅ Zuverlässig |
| App geschlossen | ❌ Nicht möglich | ✅ Funktioniert |
| iOS Do Not Disturb | ❌ Blockiert | ✅ Critical Alerts |
| Kosten | ✅ Kostenlos | ✅ Kostenlos* |

*iOS erfordert Apple Developer Account ($99/Jahr)

## Best Practices

### Für Entwicklung
- Starte ohne Push Notifications (einfacher)
- Aktiviere Push später wenn benötigt
- Teste beide Modi (mit/ohne Push)

### Für Produktion
- Aktiviere Push Notifications für zuverlässige Alarmierung
- Teste auf echten Geräten
- Überwache Push Token Registrierung in Logs
- Nutze Debug-Builds zum Testen von APNs (Sandbox)

## Weitere Ressourcen

- [Firebase Messaging Flutter Plugin](https://pub.dev/packages/firebase_messaging)
- [Firebase Cloud Messaging Dokumentation](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Server-seitige Dokumentation](../docs/PUSH-NOTIFICATIONS.md)

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/TimUx/alarm-messenger/issues
- Dokumentation: https://github.com/TimUx/alarm-messenger/tree/main/docs
