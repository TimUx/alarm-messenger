# Developer Guide: Flutter Mobile auf Linux (Android + Linux Desktop)

Dieser Guide beschreibt, wie du die Mobile-App auf einem Linux-Desktop **bauen und testen** kannst, inklusive:

- Flutter Toolchain
- Linux Desktop Build-Toolchain
- Android SDK/Emulator
- Virtualisierung mit QEMU/KVM
- iOS-Test-Realität unter Linux

---

## 1) Zielbild

Auf Linux kannst du in diesem Projekt:

- **Linux Desktop App** bauen und lokal ausfuehren
- **Android APK/AAB** bauen
- **Unit/Widget/Integration Tests** fuer Flutter laufen lassen
- Android auf Emulator oder USB-Geraet testen

Was **nicht nativ** auf Linux geht:

- iOS App lokal bauen/signen/deployen (Xcode-only, macOS erforderlich)
- QR-Registrierung per Kamera wie auf dem Smartphone: unter Linux-Desktop **manuell** den QR-Inhalt einfügen (siehe Abschnitt 4.2)

---

## 2) Voraussetzungen auf Linux

### 2.1 Flutter in PATH

Wenn Flutter unter `~/develop/flutter/bin` liegt:

```bash
echo 'export PATH="$HOME/develop/flutter/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
flutter --version
```

Optional dauerhaft fuer Android + Java (lokale User-Installation ohne sudo):

```bash
echo 'export ANDROID_HOME="$HOME/Android/Sdk"' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT="$HOME/Android/Sdk"' >> ~/.bashrc
echo 'export JAVA_HOME="$HOME/.local/jdk/jdk-17.0.19+10"' >> ~/.bashrc
echo 'export LIBRARY_PATH="/usr/lib/gcc/x86_64-linux-gnu/11:/usr/lib/x86_64-linux-gnu:$LIBRARY_PATH"' >> ~/.bashrc
echo 'export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 2.2 Linux Desktop Build-Abhaengigkeiten

Ubuntu/Mint/Debian:

```bash
sudo apt update
sudo apt install -y \
  clang cmake ninja-build pkg-config g++ build-essential \
  libgtk-3-dev liblzma-dev \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev
```

Danach pruefen:

```bash
flutter doctor -v
```

### 2.3 Android Toolchain

Installiere Android Studio (oder cmdline-tools) und danach:

```bash
flutter config --android-sdk "$HOME/Android/Sdk"
flutter doctor --android-licenses
flutter doctor -v
```

Empfohlene SDK-Komponenten:

- Android SDK Platform-Tools
- Android SDK Command-line Tools (latest)
- Android SDK Build-Tools (aktuell)
- Android Emulator
- Eine aktuelle Android Platform (z. B. API 35/36)

### 2.4 Android Toolchain ohne Android Studio (nur CLI, ohne sudo)

```bash
mkdir -p "$HOME/Android/Sdk/cmdline-tools" "$HOME/Android/tmp" "$HOME/.local/jdk"
wget -q -O "$HOME/Android/tmp/jdk17.tar.gz" "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
tar -xzf "$HOME/Android/tmp/jdk17.tar.gz" -C "$HOME/.local/jdk"
wget -q -O "$HOME/Android/tmp/cmdline-tools.zip" "https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
unzip -q -o "$HOME/Android/tmp/cmdline-tools.zip" -d "$HOME/Android/Sdk/cmdline-tools"
mv -f "$HOME/Android/Sdk/cmdline-tools/cmdline-tools" "$HOME/Android/Sdk/cmdline-tools/latest"
```

Dann:

```bash
export JAVA_HOME="$HOME/.local/jdk/jdk-17.0.19+10"
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-36" "platforms;android-35" "build-tools;35.0.0" "build-tools;28.0.3" "system-images;android-35;google_apis;x86_64"
flutter config --android-sdk "$HOME/Android/Sdk"
flutter doctor -v
```

---

## 3) Projekt vorbereiten

Im Repo:

```bash
cd mobile
flutter pub get
```

Linux-Desktop-Target ist im Projekt bereits angelegt (`mobile/linux/`).

---

## 4) Lokale Build- und Test-Befehle

### 4.1 Tests

```bash
cd mobile
make test
flutter test integration_test
# oder mit Emulator-Autostart + Boot-Wait:
./scripts/dev-mobile.sh
# alternativ:
make test-integration-android
```

Hinweis: `integration_test` braucht ein lauffaehiges Zielgeraet (Android Emulator/USB-Device oder Linux Desktop Target je nach Testfall).

### 4.2 Linux Desktop

```bash
cd mobile
make run-linux
make build-linux
```

**Geräteregistrierung (QR):** Der Linux-Desktop-Build nutzt keine Kamera-Scanner-Integration wie Android/iOS. Im Registrierungsbildschirm den **QR-Inhalt manuell einfügen** (gleicher JSON- oder `serverUrl|token`-Inhalt wie im QR-Code), z. B. aus der Admin-Antwort kopieren.

**E-Mail-Einladung:** Versand aus dem Admin-Dashboard setzt SMTP-Variablen auf dem Server voraus (`SMTP_HOST`, `SMTP_FROM`, … in `server/.env.example`). Ohne SMTP bleiben `registrationLink` und JSON trotzdem nutzbar.

Output:

- Binary/Bundle unter `mobile/build/linux/...`

### 4.3 Android

```bash
cd mobile
flutter run -d <android-device-id>
flutter build apk --debug
flutter build apk --release
flutter build appbundle --release
```

---

## 5) Virtuelle Testgeraete auf Linux

## 5.1 Android Emulator (empfohlen)

1. Android Studio -> Device Manager -> AVD erstellen  
2. x86_64 Image mit Google APIs waehlen  
3. Emulator starten  
4. Pruefen:

```bash
flutter devices
```

CLI-Variante:

```bash
echo "no" | avdmanager create avd -n "alarm-api35" -k "system-images;android-35;google_apis;x86_64" -d pixel_6
emulator -avd alarm-api35 -no-snapshot-save -no-boot-anim
adb devices
```

5. Tests/Run gegen Emulator:

```bash
flutter test integration_test -d <emulator-id>
flutter run -d <emulator-id>
```

### Performance-Tipps

- KVM aktivieren (siehe Abschnitt 6)
- Genug RAM fuer AVD (mindestens 4 GB)
- Hardware-GPU aktivieren

## 5.2 Linux VM fuer Desktop-Tests (QEMU/KVM)

Du kannst Linux-in-Linux fuer reproduzierbare GUI-Tests nutzen:

```bash
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients virt-manager bridge-utils
sudo usermod -aG kvm,libvirt $USER
newgrp kvm
```

Dann VM mit `virt-manager` anlegen, in der VM Flutter + Abhaengigkeiten installieren und dieselben Build/Test-Befehle ausfuehren.

---

## 6) KVM/Virtualisierung verifizieren

```bash
egrep -c '(vmx|svm)' /proc/cpuinfo
lsmod | rg kvm
```

- `vmx` (Intel) oder `svm` (AMD) muss vorhanden sein
- `kvm`-Module sollten geladen sein

Optional:

```bash
sudo apt install -y cpu-checker
kvm-ok
```

---

## 7) iOS unter Linux: was ist moeglich?

Lokal auf Linux:

- Kein iOS Build/Signing/Deploy mit Flutter (Xcode fehlt)

Moegliche Wege:

1. **Remote Mac Build Host** (SSH, Mac mini, MacStadium)
2. **CI auf macOS Runner** (GitHub Actions/Codemagic/Bitrise)
3. Team-Mac fuer iOS Build + Test

Empfohlene CI-Aufteilung:

- Linux Job: analyze + tests + Android build
- macOS Job: iOS build/sign/test

---

## 8) Typischer Troubleshooting-Flow

1. `flutter doctor -v`
2. Fehlende Linux-Tools installieren (`clang`, `cmake`, `ninja`)
3. Android SDK Pfad setzen (`flutter config --android-sdk ...`)
4. Lizenzen akzeptieren (`flutter doctor --android-licenses`)
5. Geraet sichtbar machen (`flutter devices`)
6. Dann:
   - `flutter test`
   - `flutter test integration_test -d <device>`
   - `flutter build linux` / `flutter build apk`

Projekt-spezifisch Android/Kotlin:

- Wenn beim Android-Build Fehler wie  
  `kotlin metadata version ... compiler version 1.9.0` auftreten,  
  setze in `mobile/android/settings.gradle` die Kotlin-Plugin-Version auf `2.1.0` oder neuer.

---

## 9) Schnellreferenz (Copy/Paste)

```bash
cd mobile
flutter doctor -v
flutter pub get
flutter test
flutter devices
flutter test integration_test -d <device-id>
flutter build linux
flutter build apk --release
```

Wenn `flutter build linux` mit `-lstdc++ kann nicht gefunden werden` fehlschlaegt:

```bash
sudo apt install -y g++ build-essential
export LIBRARY_PATH="/usr/lib/gcc/x86_64-linux-gnu/11:/usr/lib/x86_64-linux-gnu:$LIBRARY_PATH"
```

Wenn danach ein Fehler zu `gstreamer-1.0` oder `audioplayers_linux` kommt:

```bash
sudo apt install -y libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev
```
