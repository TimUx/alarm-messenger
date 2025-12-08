# Alarmgruppen-System

## Übersicht

Das Alarmgruppen-System ermöglicht es, Einsatzkräfte in Gruppen zu organisieren und Alarmierungen gezielt an bestimmte Gruppen zu senden. Dies basiert auf den Alarmierungsgruppen, die im XML vom Alarm-Monitor enthalten sind.

## Komponenten

### 1. Gruppen-Verwaltung

Gruppen werden durch folgende Eigenschaften definiert:
- **Code**: Eindeutiger Bezeichner (z.B. "WIL26", "SWA11")
- **Name**: Lesbare Bezeichnung (z.B. "WIL Steina M")
- **Beschreibung**: Optionale Zusatzinformationen (z.B. "TME WIL26")

### 2. Device-Gruppen-Zuordnung

Einsatzkräfte/Geräte können einer oder mehreren Gruppen zugeordnet werden. Dies erfolgt über die Admin-Oberfläche oder die API.

### 3. Gefilterte Alarmierung

Bei der Erstellung eines Einsatzes können Gruppen angegeben werden (kommasepariert). Das System benachrichtigt dann nur die Geräte, die mindestens einer der angegebenen Gruppen zugeordnet sind.

## API-Endpunkte

### Gruppen verwalten

```http
# Alle Gruppen abrufen
GET /api/groups
Authorization: Bearer <token>

# Neue Gruppe erstellen
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "WIL26",
  "name": "WIL Steina M",
  "description": "TME WIL26"
}

# Gruppe aktualisieren
PUT /api/groups/:code
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "WIL Steina M - Aktualisiert",
  "description": "Neue Beschreibung"
}

# Gruppe löschen
DELETE /api/groups/:code
Authorization: Bearer <token>
```

### Gruppen importieren (CSV)

```http
POST /api/groups/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "groups": [
    {
      "code": "WIL26",
      "name": "WIL Steina M",
      "description": "TME WIL26"
    },
    {
      "code": "SWA11",
      "name": "SWA Trutzhain S",
      "description": "TME SWA11"
    }
  ]
}
```

### Device-Gruppen zuordnen

```http
# Gruppen eines Geräts abrufen
GET /api/groups/device/:deviceId
Authorization: Bearer <token>

# Gruppen einem Gerät zuordnen
PUT /api/groups/device/:deviceId
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupCodes": ["WIL26", "SWA11"]
}
```

### Einsatz mit Gruppen erstellen

```http
POST /api/emergencies
X-API-Key: <api-key>
Content-Type: application/json

{
  "emergencyNumber": "2025-001",
  "emergencyDate": "20251208120000",
  "emergencyKeyword": "Brand",
  "emergencyDescription": "Wohnungsbrand",
  "emergencyLocation": "Musterstraße 123",
  "groups": "WIL26,SWA11,WIL50"
}
```

## Admin-Oberfläche

### Gruppen-Management

In der Admin-Oberfläche gibt es einen neuen Bereich "Alarmierungsgruppen" mit folgenden Funktionen:

1. **Neue Gruppe**: Erstellt eine neue Gruppe manuell
2. **CSV Import**: Importiert mehrere Gruppen aus CSV-Format
3. **Bearbeiten**: Aktualisiert Name und Beschreibung einer Gruppe
4. **Löschen**: Entfernt eine Gruppe

### CSV-Format für Import

```csv
code,name,description
WIL26,WIL Steina M,TME WIL26
SWA11,SWA Trutzhain S,TME SWA11
WIL50,WIL GBI,TME WIL50
```

**Hinweise:**
- Die erste Zeile (Header) ist optional
- Codes werden automatisch in Großbuchstaben konvertiert
- Bestehende Gruppen werden aktualisiert, neue werden erstellt

### Device-Bearbeitung

Beim Bearbeiten einer Einsatzkraft können nun Gruppen über Checkboxen zugeordnet werden. Die zugeordneten Gruppen werden auf der Device-Karte angezeigt.

## Filterlogik

### Mit Gruppen

Wenn ein Einsatz mit Gruppen erstellt wird:
1. System extrahiert die Gruppencodes (kommasepariert)
2. Sucht alle aktiven Geräte, die mindestens einer Gruppe zugeordnet sind
3. Sendet Benachrichtigungen nur an diese Geräte

**Beispiel:**
- Einsatz mit Gruppen: `"WIL26,SWA11"`
- Gerät A: Zugeordnet zu `["WIL26"]` → **wird benachrichtigt**
- Gerät B: Zugeordnet zu `["SWA11", "WIL50"]` → **wird benachrichtigt**
- Gerät C: Zugeordnet zu `["WIL50"]` → **wird NICHT benachrichtigt**
- Gerät D: Keine Gruppen → **wird NICHT benachrichtigt**

### Ohne Gruppen

Wenn ein Einsatz ohne Gruppen erstellt wird, werden **alle** aktiven Geräte benachrichtigt (wie bisher).

## XML-Parsing

Der Alarm-Monitor sendet TME-Informationen im folgenden Format:

```xml
<TME>
  <BEZEICHNUNG>WIL GBI (TME WIL50)</BEZEICHNUNG>
  <AUSFUE_ZEIT>20251104045736</AUSFUE_ZEIT>
  <BEZEICHNUNG>WIL Steina M (TME WIL26)</BEZEICHNUNG>
  <AUSFUE_ZEIT>20251104045736</AUSFUE_ZEIT>
</TME>
```

Die Gruppencodes (z.B. `WIL26`, `WIL50`) müssen aus den BEZEICHNUNG-Tags extrahiert werden. Dies sollte im Alarm-Monitor-Parser implementiert werden, der dann die Codes kommasepariert an die API übergibt.

**Beispiel für extrahierte Gruppencodes:** `"WIL50,WIL26"`

## Sicherheit & Validierung

- Gruppencodes: Nur Buchstaben, Zahlen und Bindestriche, maximal 20 Zeichen
- Maximale Anzahl Gruppen pro Einsatz: 50
- Alle Codes werden automatisch in Großbuchstaben konvertiert
- Ungültige Zeichen werden abgelehnt

## Datenbank-Schema

### Tabelle: groups

```sql
CREATE TABLE groups (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
```

### Tabelle: device_groups

```sql
CREATE TABLE device_groups (
  device_id TEXT NOT NULL,
  group_code TEXT NOT NULL,
  PRIMARY KEY (device_id, group_code),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE
);
```

### Tabelle: emergencies (erweitert)

```sql
ALTER TABLE emergencies ADD COLUMN groups TEXT;
```

## Migration

Für bestehende Installationen wird automatisch eine Migration durchgeführt, die:
- Die `groups` Spalte zur `emergencies` Tabelle hinzufügt
- Die neuen Tabellen `groups` und `device_groups` erstellt

Die Migration wird beim Serverstart automatisch ausgeführt.
