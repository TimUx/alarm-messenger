# Flutter Mobile App - Quick Start Guide

Schnellanleitung zum Einrichten und Bauen der Flutter Mobile App.

## Voraussetzungen

- **Flutter SDK 3.27.1+** - [Installation Guide](https://docs.flutter.dev/get-started/install)
- **Android Studio** (für Android) - [Download](https://developer.android.com/studio)
- **Xcode** (für iOS, nur macOS) - [Download](https://developer.apple.com/xcode/)

## 1. Flutter SDK installieren

### Linux/macOS
```bash
# Flutter SDK herunterladen
cd ~
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:$HOME/flutter/bin"

# Zu .bashrc oder .zshrc hinzufügen
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.bashrc

# Installation überprüfen
flutter doctor
```

### Windows
```bash
# Flutter SDK von https://docs.flutter.dev/get-started/install/windows herunterladen
# Entpacken und PATH-Variable setzen
# Dann:
flutter doctor
```

## 2. Dependencies installieren

```bash
cd mobile
flutter pub get
```

## 3. Entwickeln

### Android Emulator starten
```bash
# In Android Studio: Tools > Device Manager > Create Device
# Oder via Terminal:
emulator -avd <device_name>
```

### App starten
```bash
# Debug-Modus mit Hot Reload
flutter run

# Oder spezifisches Device
flutter devices  # Liste verfügbare Geräte
flutter run -d <device_id>
```

### Hot Reload
- Drücke `r` im Terminal für Hot Reload
- Drücke `R` für Hot Restart
- Oder nutze IDE Buttons

## 4. Bauen

### Android Debug APK
```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

### Android Release APK
```bash
# Keystore erforderlich (siehe SIGNING.md)
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Android App Bundle (für Play Store)
```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### iOS (nur macOS)
```bash
# Dependencies installieren
cd ios && pod install && cd ..

# Debug Build
flutter build ios --debug

# Release Build (Code Signing erforderlich)
flutter build ios --release
```

## 5. Testen

### Unit Tests
```bash
flutter test
```

### Integration Tests
```bash
flutter drive --target=test_driver/app.dart
```

### Analyzer ausführen
```bash
flutter analyze
```

## 6. Problembehebung

### Flutter Doctor ausführen
```bash
flutter doctor -v
# Zeigt alle Probleme und fehlende Dependencies
```

### Dependencies aktualisieren
```bash
flutter pub upgrade
```

### Cache leeren
```bash
flutter clean
flutter pub get
```

### Android Build Probleme

**Gradle Fehler:**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

**SDK-Lizenzen:**
```bash
flutter doctor --android-licenses
```

**Namespace-Fehler bei Flutter Plugins:**
```
A problem occurred configuring project ':plugin_name'.
> Namespace not specified.
```

Dieses Problem tritt bei älteren Flutter-Plugins auf, die noch nicht für Android Gradle Plugin (AGP) 8.x aktualisiert wurden. Die Lösung ist bereits in `android/build.gradle` implementiert: Ein automatisches Skript extrahiert den Namespace aus der `AndroidManifest.xml` der Plugins und setzt ihn entsprechend.

Falls das Problem weiterhin besteht:
```bash
flutter clean
flutter pub get
cd android
./gradlew clean
cd ..
flutter build apk --debug
```

### iOS Build Probleme

**Pod Install Fehler:**
```bash
cd ios
rm Podfile.lock
rm -rf Pods
pod install --repo-update
cd ..
```

**Xcode Build Fehler:**
```bash
cd ios
xcodebuild clean
cd ..
flutter clean
```

## 7. IDE Setup

### VS Code
```bash
# Extensions installieren:
# - Flutter
# - Dart
```

**Einstellungen (.vscode/settings.json):**
```json
{
  "dart.flutterSdkPath": "/path/to/flutter",
  "dart.previewFlutterUiGuides": true,
  "dart.previewFlutterUiGuidesCustomTracking": true
}
```

### Android Studio
```bash
# Plugins installieren:
# - Flutter plugin
# - Dart plugin
```

## 8. Assets hinzufügen

### App Icons
Siehe `mobile/assets/README.md` für Details zu App Icons.

### Alarm Sound
1. MP3-Datei erstellen oder herunterladen
2. Als `mobile/assets/sounds/alarm.mp3` speichern
3. `flutter clean && flutter build apk`

## 9. Code Signing (für Release)

### Android
Siehe separate Dokumentation für Keystore-Erstellung und Konfiguration.

**Kurzversion:**
```bash
# Keystore erstellen
keytool -genkey -v -keystore alarm-messenger.keystore \
  -alias alarm-messenger -keyalg RSA -keysize 2048 -validity 10000

# In android/app/build.gradle bereits konfiguriert
# Umgebungsvariablen setzen:
export MYAPP_RELEASE_STORE_FILE=alarm-messenger.keystore
export MYAPP_RELEASE_KEY_ALIAS=alarm-messenger
export MYAPP_RELEASE_STORE_PASSWORD=your_password
export MYAPP_RELEASE_KEY_PASSWORD=your_password
```

### iOS
- Apple Developer Account erforderlich
- Xcode für Signing konfigurieren
- Siehe [iOS Deployment Guide](https://docs.flutter.dev/deployment/ios)

## 10. Häufige Befehle

```bash
# Packages installieren
flutter pub get

# Packages aktualisieren
flutter pub upgrade

# Linter ausführen
flutter analyze

# Tests ausführen
flutter test

# Format code
dart format lib/

# App im Debug-Modus starten
flutter run

# App im Release-Modus starten
flutter run --release

# Build Info anzeigen
flutter build apk --debug --verbose

# Cache leeren
flutter clean

# Doctor ausführen
flutter doctor -v

# Verbundene Geräte anzeigen
flutter devices

# Logs anzeigen
flutter logs
```

## 11. Performance Profiling

```bash
# Profile Mode (Performance-Analyse)
flutter run --profile

# DevTools öffnen
flutter pub global activate devtools
flutter pub global run devtools

# Dann im Browser: http://127.0.0.1:9100
```

## 12. Nützliche Links

- [Flutter Dokumentation](https://docs.flutter.dev/)
- [Dart API Referenz](https://api.dart.dev/)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [Pub.dev Packages](https://pub.dev/)
- [Flutter Community](https://flutter.dev/community)

## Support

Bei Problemen:
1. `flutter doctor -v` ausführen
2. GitHub Issues durchsuchen
3. Neues Issue erstellen mit Logs und Flutter Version
