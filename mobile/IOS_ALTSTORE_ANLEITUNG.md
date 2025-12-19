# iOS Build für AltStore/AltServer

Dieser Workflow erstellt eine IPA-Datei, die mit AltStore/AltServer auf iOS-Geräten installiert werden kann.

## Zwei Build-Modi

### 1. Unsignierte IPA (Standard)
- Wird automatisch erstellt, wenn keine Signatur-Zertifikate konfiguriert sind
- Artifact-Name: `alarm-messenger-unsigned.ipa`
- **Verwendung**: Diese IPA-Datei muss mit AltStore/AltServer signiert werden
- **Vorteil**: Keine Apple Developer Account Zertifikate erforderlich

### 2. Signierte IPA (Optional)
- Wird erstellt, wenn Signatur-Zertifikate konfiguriert sind
- Artifact-Name: `alarm-messenger-signed.ipa`
- **Verwendung**: Kann direkt installiert werden (mit AltStore oder direkt)
- **Voraussetzung**: Apple Developer Account und konfigurierte Secrets

## AltStore/AltServer Nutzung

### Schritt 1: IPA herunterladen
1. Gehe zu GitHub Actions in diesem Repository
2. Starte den "Flutter Mobile Build" Workflow manuell (workflow_dispatch)
3. Warte bis der Build abgeschlossen ist
4. Lade das Artifact `alarm-messenger-unsigned.ipa` herunter

### Schritt 2: Mit AltStore installieren
1. Installiere AltStore auf deinem Computer: https://altstore.io/
2. Installiere AltServer auf deinem Computer
3. Verbinde dein iOS-Gerät mit deinem Computer
4. Öffne AltServer und wähle "Install AltStore" auf deinem Gerät
5. In AltStore auf dem Gerät: Tippe auf "+" und wähle die heruntergeladene IPA-Datei
6. AltStore wird die App mit deiner Apple ID signieren und installieren

### Schritt 3: App verwalten
- Die App muss alle 7 Tage über AltStore neu signiert werden (kostenloser Apple Developer Account)
- Mit bezahltem Apple Developer Account: 1 Jahr Gültigkeit
- AltStore kann Apps automatisch im Hintergrund erneuern

## Signierte IPA erstellen (Optional)

Wenn du eine bereits signierte IPA erstellen möchtest (z.B. für Enterprise Distribution):

### Voraussetzungen
1. Apple Developer Account
2. Entwicklungs- oder Ad-Hoc Zertifikat (.p12 Datei)
3. Provisioning Profile (.mobileprovision Datei)

### Konfiguration

1. **Erstelle die Secrets in GitHub**:
   - `IOS_SIGNING_CERT`: Base64-kodiertes .p12 Zertifikat
   - `IOS_PROVISIONING_PROFILE`: Base64-kodiertes .mobileprovision
   - `IOS_SIGNING_CERT_PASSWORD`: Passwort für das Zertifikat

2. **Erstelle die Variable**:
   - `IOS_SIGNING_ENABLED`: Setze auf `true`

3. **Base64-Kodierung erstellen**:
```bash
# Für das Zertifikat
base64 -i certificate.p12 | pbcopy

# Für das Provisioning Profile
base64 -i profile.mobileprovision | pbcopy
```

4. **Workflow manuell starten**:
   - Der Workflow erkennt automatisch die konfigurierten Secrets
   - Erstellt eine signierte IPA, die direkt installierbar ist

## Hinweise

- **Unsignierte IPA**: Perfekt für AltStore/AltServer - keine Konfiguration nötig
- **Signierte IPA**: Nur wenn du eigene Zertifikate verwenden möchtest
- AltStore funktioniert mit jedem kostenlosen Apple ID Account
- Die App verhält sich identisch, egal ob signiert oder über AltStore installiert

## Links

- [AltStore Website](https://altstore.io/)
- [AltStore FAQ](https://faq.altstore.io/)
- [Flutter iOS Deployment](https://docs.flutter.dev/deployment/ios)
