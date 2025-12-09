# Mobile App Build-Anleitung für Linux

Eine Schritt-für-Schritt-Anleitung zum Kompilieren und Erstellen der Alarm Messenger Mobile App für Android und iOS unter Linux.

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Voraussetzungen](#voraussetzungen)
- [Android App unter Linux bauen](#android-app-unter-linux-bauen)
  - [Schritt 1: System vorbereiten](#schritt-1-system-vorbereiten)
  - [Schritt 2: Java Development Kit installieren](#schritt-2-java-development-kit-installieren)
  - [Schritt 3: Android Studio installieren](#schritt-3-android-studio-installieren)
  - [Schritt 4: Android SDK konfigurieren](#schritt-4-android-sdk-konfigurieren)
  - [Schritt 5: Node.js installieren](#schritt-5-nodejs-installieren)
  - [Schritt 6: Projekt-Dependencies installieren](#schritt-6-projekt-dependencies-installieren)
  - [Schritt 7: Debug-APK erstellen](#schritt-7-debug-apk-erstellen)
  - [Schritt 8: Release-APK erstellen (signiert)](#schritt-8-release-apk-erstellen-signiert)
- [iOS App unter Linux (Hinweise)](#ios-app-unter-linux-hinweise)
- [Automatische Builds mit GitHub Actions](#automatische-builds-mit-github-actions)
- [Troubleshooting](#troubleshooting)

## Übersicht

Diese Anleitung beschreibt, wie Sie die Mobile App auf einem Linux-System kompilieren können. 

**Wichtig zu wissen:**
- ✅ **Android APK** kann vollständig unter Linux gebaut werden
- ❌ **iOS IPA** kann NICHT unter Linux gebaut werden (erfordert macOS und Xcode)
- ✅ **GitHub Actions** kann beide Plattformen automatisch bauen (Android auf Linux-Runner, iOS auf macOS-Runner)

## Voraussetzungen

- Linux-Distribution (Ubuntu 20.04 LTS oder neuer empfohlen)
- Mindestens 8 GB RAM
- 20 GB freier Festplattenspeicher
- Internetverbindung

## Android App unter Linux bauen

### Schritt 1: System vorbereiten

Aktualisieren Sie Ihr System:

```bash
sudo apt update
sudo apt upgrade -y
```

Installieren Sie notwendige Tools:

```bash
sudo apt install -y curl wget git unzip
```

### Schritt 2: Java Development Kit installieren

Die Android-Build-Tools benötigen Java 11 oder höher.

**OpenJDK 11 installieren:**

```bash
sudo apt install -y openjdk-11-jdk
```

**Java-Version prüfen:**

```bash
java -version
javac -version
```

Sie sollten eine Ausgabe wie diese sehen:
```
openjdk version "11.0.x"
```

### Schritt 3: Android Studio installieren

**Option A: Über Snap (empfohlen)**

```bash
sudo snap install android-studio --classic
```

**Option B: Manueller Download**

1. Besuchen Sie https://developer.android.com/studio
2. Laden Sie Android Studio für Linux herunter
3. Entpacken Sie das Archiv:
   ```bash
   cd ~/Downloads
   tar -xzf android-studio-*.tar.gz
   sudo mv android-studio /opt/
   ```
4. Starten Sie Android Studio:
   ```bash
   /opt/android-studio/bin/studio.sh
   ```

### Schritt 4: Android SDK konfigurieren

**Android Studio starten und SDK einrichten:**

1. Öffnen Sie Android Studio
2. Folgen Sie dem Setup-Assistenten
3. Installieren Sie die empfohlenen SDK-Pakete

**SDK Command Line Tools installieren:**

1. In Android Studio: **Tools** → **SDK Manager**
2. Wechseln Sie zum Tab **SDK Tools**
3. Aktivieren Sie:
   - ✅ Android SDK Command-line Tools
   - ✅ Android SDK Build-Tools (neueste Version)
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
4. Klicken Sie auf **OK** und **Apply**

**Umgebungsvariablen setzen:**

Fügen Sie diese Zeilen zu `~/.bashrc` oder `~/.zshrc` hinzu:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Laden Sie die Konfiguration neu:

```bash
source ~/.bashrc
# oder
source ~/.zshrc
```

**Installation prüfen:**

```bash
echo $ANDROID_HOME
adb --version
```

### Schritt 5: Node.js installieren

**Node.js 18 oder höher über NodeSource installieren:**

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Installation prüfen:**

```bash
node --version  # sollte v20.x.x oder höher zeigen
npm --version   # sollte 10.x.x oder höher zeigen
```

### Schritt 6: Projekt-Dependencies installieren

**Repository klonen:**

```bash
git clone https://github.com/TimUx/alarm-messenger.git
cd alarm-messenger/mobile
```

**Dependencies installieren:**

```bash
npm install
```

Dieser Vorgang kann einige Minuten dauern und lädt alle erforderlichen JavaScript-Pakete herunter.

### Schritt 7: Debug-APK erstellen

**Debug-APK bauen:**

```bash
cd android
./gradlew assembleDebug
```

**Beim ersten Mal:**
- Gradle lädt automatisch alle benötigten Abhängigkeiten herunter
- Der Vorgang kann 5-10 Minuten dauern
- Anschließende Builds sind schneller

**APK finden:**

Die fertige APK befindet sich unter:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**APK auf Gerät installieren:**

```bash
# Android-Gerät per USB verbinden und USB-Debugging aktivieren
adb devices  # Prüfen, ob Gerät erkannt wird

# APK installieren
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Oder APK manuell kopieren:**

```bash
# APK per E-Mail, Cloud oder USB auf das Gerät übertragen
# Auf dem Android-Gerät: "Installation aus unbekannten Quellen" aktivieren
# APK-Datei öffnen und Installation bestätigen
```

### Schritt 8: Release-APK erstellen (signiert)

Für die Produktion benötigen Sie eine signierte Release-APK.

#### 8.1 Signing-Schlüssel generieren (einmalig)

```bash
cd android/app

keytool -genkey -v \
  -keystore alarm-messenger.keystore \
  -alias alarm-messenger \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Wichtig:**
- Wählen Sie ein **sicheres Passwort**
- Notieren Sie sich alle eingegebenen Daten
- **BACKUP DES KEYSTORE ERSTELLEN** - ohne diesen können Sie keine Updates veröffentlichen!
- Speichern Sie den Keystore sicher (z.B. in einem Passwort-Manager oder verschlüsseltem Backup)

#### 8.2 Signing-Konfiguration einrichten

**Option A: Über Umgebungsvariablen (empfohlen für CI/CD)**

```bash
export MYAPP_RELEASE_STORE_FILE=alarm-messenger.keystore
export MYAPP_RELEASE_KEY_ALIAS=alarm-messenger
export MYAPP_RELEASE_STORE_PASSWORD=IhrPasswort
export MYAPP_RELEASE_KEY_PASSWORD=IhrPasswort
```

**Option B: Über gradle.properties (lokal)**

Erstellen Sie die Datei `android/gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=alarm-messenger.keystore
MYAPP_RELEASE_KEY_ALIAS=alarm-messenger
MYAPP_RELEASE_STORE_PASSWORD=IhrPasswort
MYAPP_RELEASE_KEY_PASSWORD=IhrPasswort
```

**⚠️ ACHTUNG:** Diese Datei NICHT in Git committen! Sie ist bereits in `.gitignore`.

#### 8.3 Release-APK bauen

```bash
cd android
./gradlew assembleRelease
```

**Release-APK finden:**

```
android/app/build/outputs/apk/release/app-release.apk
```

Diese APK ist:
- ✅ Signiert und verifiziert
- ✅ Optimiert (kleinere Dateigröße)
- ✅ Bereit für den Produktionseinsatz
- ✅ Kann per E-Mail, Website oder als Direct Download verteilt werden
- ✅ Kann im Google Play Store veröffentlicht werden (als AAB)

#### 8.4 Android App Bundle (AAB) für Play Store erstellen

Falls Sie die App im Google Play Store veröffentlichen möchten:

```bash
cd android
./gradlew bundleRelease
```

Die AAB-Datei finden Sie unter:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## iOS App unter Linux (Hinweise)

**Leider ist es NICHT möglich, iOS-Apps direkt unter Linux zu bauen.**

**Warum?**
- iOS-Apps benötigen Xcode, das nur auf macOS läuft
- Apple's Code-Signing funktioniert nur mit macOS-Tools
- Der iOS-Simulator läuft nur auf macOS

**Alternativen:**

### 1. GitHub Actions (empfohlen)
GitHub Actions kann iOS-Apps automatisch auf macOS-Runnern bauen. Siehe Abschnitt [Automatische Builds mit GitHub Actions](#automatische-builds-mit-github-actions).

### 2. Cloud-basierte Build-Services
- **MacStadium**: Dedizierte macOS-Server
- **MacinCloud**: macOS-Instanzen in der Cloud
- **AWS EC2 Mac Instances**: Apple Hardware in AWS
- **Codemagic**: Spezialisiert auf Flutter/React Native (unterstützt auch iOS-Builds)

### 3. Lokaler Mac oder Hackintosh
- Zugriff auf einen physischen Mac
- Virtuelle macOS-Installation (rechtliche Grauzone, nur mit Apple Hardware erlaubt)

### 4. React Native Web
Falls eine Web-Version ausreichend ist, kann die App als Progressive Web App (PWA) bereitgestellt werden.

## Automatische Builds mit GitHub Actions

GitHub Actions kann automatisch APKs (Android) und IPAs (iOS) erstellen, sobald sich Code ändert.

**Vorteile:**
- ✅ Vollautomatischer Build-Prozess
- ✅ Linux-Runner für Android (kostenlos für Public Repos)
- ✅ macOS-Runner für iOS (kostenlos für Public Repos)
- ✅ Automatische Releases bei neuen Git-Tags
- ✅ Keine lokale Build-Umgebung erforderlich

Die Workflow-Datei ist bereits im Repository verfügbar unter:
```
.github/workflows/mobile-build.yml
```

**Verwendung:**

1. **Automatischer Build bei Code-Änderungen:**
   ```bash
   # Änderungen in mobile/ committen und pushen
   git add mobile/
   git commit -m "Update mobile app"
   git push
   ```
   GitHub Actions startet automatisch den Build.

2. **Release erstellen:**
   ```bash
   # Tag erstellen
   git tag mobile-v1.0.0
   git push origin mobile-v1.0.0
   ```
   GitHub Actions baut die Apps und erstellt automatisch ein GitHub Release mit APK und IPA.

3. **Manueller Trigger:**
   - Gehen Sie zu GitHub → Actions → "Mobile App Build"
   - Klicken Sie auf "Run workflow"

**Erforderliche GitHub Secrets:**

Für automatische Android-Releases müssen Sie folgende Secrets in Ihrem Repository einrichten:

1. Gehen Sie zu **Settings** → **Secrets and variables** → **Actions**
2. Klicken Sie auf **New repository secret**
3. Fügen Sie hinzu:

| Secret Name | Beschreibung | Wie erstellen |
|------------|--------------|---------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-kodierter Keystore | `base64 -w 0 android/app/alarm-messenger.keystore` |
| `ANDROID_KEY_ALIAS` | Keystore Alias | `alarm-messenger` |
| `ANDROID_STORE_PASSWORD` | Keystore Passwort | Ihr gewähltes Passwort |
| `ANDROID_KEY_PASSWORD` | Key Passwort | Ihr gewähltes Passwort |

**iOS-Builds in GitHub Actions:**

iOS-Builds sind in GitHub Actions vorkonfiguriert, benötigen aber:
- Apple Developer Account (99€/Jahr)
- Code-Signing-Zertifikate
- Provisioning Profiles

Details siehe [MOBILE.md](MOBILE.md#github-actions-für-automatische-releases).

## Troubleshooting

### Android SDK nicht gefunden

**Problem:** `ANDROID_HOME` ist nicht gesetzt

**Lösung:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc
```

### Gradle Build schlägt fehl

**Problem:** Build-Fehler beim ersten Ausführen

**Lösung:**
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### Java-Version Konflikt

**Problem:** Falsche Java-Version

**Lösung:**
```bash
# Installierte Java-Versionen anzeigen
update-java-alternatives --list

# Java 11 setzen
sudo update-java-alternatives --set java-1.11.0-openjdk-amd64
```

### ADB erkennt Gerät nicht

**Problem:** `adb devices` zeigt kein Gerät

**Lösung:**
```bash
# ADB-Server neustarten
adb kill-server
adb start-server

# Auf Android-Gerät:
# - USB-Debugging aktivieren (Entwickleroptionen)
# - USB-Debugging-Berechtigung erteilen
# - USB-Modus auf "Dateiübertragung" oder "PTP" setzen
```

### Gradlew Permission Denied

**Problem:** `./gradlew` kann nicht ausgeführt werden

**Lösung:**
```bash
chmod +x android/gradlew
```

### Out of Memory beim Build

**Problem:** Gradle Build läuft in OutOfMemoryError

**Lösung:**

Erstellen oder bearbeiten Sie `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
```

### React Native Command nicht gefunden

**Problem:** `react-native` Befehl nicht verfügbar

**Lösung:**
```bash
# React Native CLI ist nicht mehr erforderlich
# Nutzen Sie stattdessen:
npx react-native run-android
```

### Metro Bundler Port bereits belegt

**Problem:** Port 8081 ist bereits in Verwendung

**Lösung:**
```bash
# Metro Bundler mit anderem Port starten
npx react-native start --port 8088

# Oder bestehenden Prozess beenden
lsof -ti:8081 | xargs kill -9
```

## Weitere Ressourcen

- **Hauptdokumentation:** [MOBILE.md](MOBILE.md)
- **React Native Docs:** https://reactnative.dev/docs/getting-started
- **Android Developer:** https://developer.android.com/
- **GitHub Actions:** https://docs.github.com/en/actions

## Zusammenfassung

**Android APK unter Linux bauen:**
```bash
# 1. System vorbereiten
sudo apt install -y openjdk-11-jdk

# 2. Android Studio installieren
sudo snap install android-studio --classic

# 3. Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Projekt klonen und Dependencies installieren
git clone https://github.com/TimUx/alarm-messenger.git
cd alarm-messenger/mobile
npm install

# 5. Debug-APK erstellen
cd android
./gradlew assembleDebug

# 6. Release-APK erstellen (nach Keystore-Setup)
./gradlew assembleRelease
```

**Fertig!** Die APK befindet sich unter `android/app/build/outputs/apk/`.

Bei Fragen oder Problemen öffnen Sie bitte ein Issue auf GitHub.
